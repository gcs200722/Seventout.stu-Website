import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import { PromotionsApplicationService } from '../promotions/promotions.application.service';
import { ProductEntity } from '../products/product.entity';
import { resolveStoredProductImageUrl } from '../../core/storage/product-stored-image-url';
import { STORAGE_PORT } from '../../core/storage/storage.constants';
import type { StoragePort } from '../../core/storage/storage.port';
import { AddWishlistItemDto } from './dto/add-wishlist-item.dto';
import { ListWishlistQueryDto } from './dto/list-wishlist.query.dto';
import { WishlistEventOutboxEntity } from './entities/wishlist-event-outbox.entity';
import { WishlistItemEntity } from './entities/wishlist-item.entity';
import { WishlistEventDispatcherService } from './events/wishlist-event-dispatcher.service';
import { WishlistEventType } from './wishlist.types';

export type WishlistListItemView = {
  product_id: string;
  product_name: string;
  price: number;
  image: string;
  promotion?: {
    campaign_name: string;
    list_price: number;
    sale_price: number;
    conditions_display?: {
      min_quantity: number | null;
      min_order_value: number | null;
      scoped_to_products: boolean;
      scoped_to_categories: boolean;
    };
  };
};

@Injectable()
export class WishlistApplicationService {
  private readonly imageUrlTtlSeconds: number;

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(WishlistItemEntity)
    private readonly wishlistRepository: Repository<WishlistItemEntity>,
    @InjectRepository(WishlistEventOutboxEntity)
    private readonly outboxRepository: Repository<WishlistEventOutboxEntity>,
    private readonly eventDispatcher: WishlistEventDispatcherService,
    @Inject(STORAGE_PORT) private readonly storage: StoragePort,
    private readonly configService: ConfigService,
    private readonly promotionsApplication: PromotionsApplicationService,
  ) {
    this.imageUrlTtlSeconds = this.configService.get<number>(
      'AWS_S3_PRESIGNED_EXPIRES_SECONDS',
      900,
    );
  }

  async processOutbox(): Promise<void> {
    const events = await this.outboxRepository.find({
      where: { processedAt: IsNull() },
      order: { createdAt: 'ASC' },
      take: 50,
    });
    for (const event of events) {
      try {
        await this.eventDispatcher.dispatch(event);
        event.processedAt = new Date();
        event.failedAt = null;
        event.errorMessage = null;
      } catch (error) {
        event.retryCount += 1;
        event.failedAt = new Date();
        event.errorMessage =
          error instanceof Error
            ? error.message
            : 'Unknown wishlist event dispatch failure';
      }
      await this.outboxRepository.save(event);
    }
  }

  async addItem(
    userId: string,
    dto: AddWishlistItemDto,
  ): Promise<{ created: boolean }> {
    return this.dataSource.transaction(async (manager) => {
      const productRepo = manager.getRepository(ProductEntity);
      const wishRepo = manager.getRepository(WishlistItemEntity);
      const outboxRepo = manager.getRepository(WishlistEventOutboxEntity);

      const product = await productRepo.findOne({
        where: { id: dto.product_id },
      });
      if (!product || product.deletedAt || !product.isActive) {
        throw new NotFoundException({
          message: 'Product does not exist',
          details: {
            code: 'PRODUCT_NOT_FOUND',
            product_id: dto.product_id,
          },
        });
      }

      const existing = await wishRepo.findOne({
        where: { userId, productId: dto.product_id },
      });
      if (existing) {
        return { created: false };
      }

      const row = wishRepo.create({
        userId,
        productId: dto.product_id,
      });
      await wishRepo.save(row);

      await outboxRepo.save(
        outboxRepo.create({
          eventType: WishlistEventType.ADDED,
          payload: {
            user_id: userId,
            product_id: dto.product_id,
            wishlist_item_id: row.id,
          },
        }),
      );

      return { created: true };
    });
  }

  async removeItem(userId: string, productId: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const wishRepo = manager.getRepository(WishlistItemEntity);
      const outboxRepo = manager.getRepository(WishlistEventOutboxEntity);

      const result = await wishRepo.delete({ userId, productId });
      const affected = result.affected ?? 0;
      if (affected > 0) {
        await outboxRepo.save(
          outboxRepo.create({
            eventType: WishlistEventType.REMOVED,
            payload: { user_id: userId, product_id: productId },
          }),
        );
      }
    });
  }

  async listItems(
    userId: string,
    query: ListWishlistQueryDto,
  ): Promise<{ items: WishlistListItemView[]; total: number }> {
    const qb = this.wishlistRepository
      .createQueryBuilder('wi')
      .innerJoinAndSelect('wi.product', 'p', 'p.deleted_at IS NULL')
      .where('wi.userId = :userId', { userId })
      .orderBy('wi.createdAt', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit);

    const [rows, total] = await qb.getManyAndCount();

    const bucket = this.configService.get<string>('AWS_S3_BUCKET');
    const itemsBase: WishlistListItemView[] = await Promise.all(
      rows.map(async (wi) => ({
        product_id: wi.product.id,
        product_name: wi.product.name,
        price: wi.product.price,
        image: await resolveStoredProductImageUrl(
          this.storage,
          wi.product.thumbnail,
          this.imageUrlTtlSeconds,
          bucket,
        ),
      })),
    );

    let items = itemsBase;
    try {
      const previews =
        await this.promotionsApplication.previewCatalogPromotionsForProducts(
          rows.map((wi) => ({
            productId: wi.product.id,
            categoryId: wi.product.categoryId,
            unitPrice: wi.product.price,
          })),
        );
      items = itemsBase.map((row) => {
        const preview = previews[row.product_id];
        if (
          !preview ||
          preview.discount_amount <= 0 ||
          !preview.campaign_name
        ) {
          return row;
        }
        return {
          ...row,
          promotion: {
            campaign_name: preview.campaign_name,
            list_price: preview.list_price,
            sale_price: preview.sale_price,
            ...(preview.conditions_display
              ? { conditions_display: preview.conditions_display }
              : {}),
          },
        };
      });
    } catch {
      items = itemsBase;
    }

    return { items, total };
  }

  async isFavorite(userId: string, productId: string): Promise<boolean> {
    const found = await this.wishlistRepository.findOne({
      where: { userId, productId },
      select: ['id'],
    });
    return Boolean(found);
  }
}
