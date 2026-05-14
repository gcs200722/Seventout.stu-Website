import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import type { AuthenticatedUser } from '../auth/auth.types';
import {
  AuditAction,
  AuditEntityType,
  type AuditActionCode,
} from '../audit/audit.constants';
import { AuditWriterService } from '../audit/audit-writer.service';
import { ProductEntity } from '../products/product.entity';
import { ProductVariantEntity } from '../products/product-variant.entity';
import { QUEUE_PORT } from '../queue/queue.constants';
import type { QueuePort } from '../queue/queue.port';
import { AdjustInventoryDto } from './dto/adjust-inventory.dto';
import { ListInventoryMovementsQueryDto } from './dto/list-inventory-movements.query.dto';
import { ListInventoryQueryDto } from './dto/list-inventory.query.dto';
import { SyncInventoryDto } from './dto/sync-inventory.dto';
import { InventoryEntity } from './entities/inventory.entity';
import { InventoryMovementEntity } from './entities/inventory-movement.entity';
import { ProductChannelMappingEntity } from './entities/product-channel-mapping.entity';
import {
  InventoryChannel,
  InventoryJobName,
  InventoryMovementType,
} from './inventory.types';

type StockDeltaResult = {
  beforeStock: number;
  afterStock: number;
  availableStock: number;
  reservedStock: number;
};

type InventoryAuditReason = 'order' | 'manual' | 'system';

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);
  private readonly listCache = new Map<
    string,
    {
      expiresAt: number;
      data: { items: Array<Record<string, unknown>>; total: number };
    }
  >();
  private readonly listCacheTtlMs = 60_000;
  private readonly lowStockThreshold = 10;

  constructor(
    @InjectRepository(ProductEntity)
    private readonly productsRepository: Repository<ProductEntity>,
    @InjectRepository(ProductVariantEntity)
    private readonly variantsRepository: Repository<ProductVariantEntity>,
    @InjectRepository(InventoryEntity)
    private readonly inventoriesRepository: Repository<InventoryEntity>,
    @InjectRepository(InventoryMovementEntity)
    private readonly movementsRepository: Repository<InventoryMovementEntity>,
    @InjectRepository(ProductChannelMappingEntity)
    private readonly mappingsRepository: Repository<ProductChannelMappingEntity>,
    @Inject(QUEUE_PORT)
    private readonly queuePort: QueuePort,
    private readonly dataSource: DataSource,
    private readonly auditWriter: AuditWriterService,
  ) {}

  async listInventory(query: ListInventoryQueryDto): Promise<{
    items: Array<Record<string, unknown>>;
    total: number;
  }> {
    const key = JSON.stringify(query);
    const cached = this.listCache.get(key);
    const now = Date.now();
    if (cached && cached.expiresAt > now) {
      return cached.data;
    }

    const qb = this.inventoriesRepository
      .createQueryBuilder('inventory')
      .innerJoin(
        ProductVariantEntity,
        'variant',
        'variant.id = inventory.product_variant_id',
      )
      .innerJoin(ProductEntity, 'product', 'product.id = variant.product_id')
      .where('product.deleted_at IS NULL');

    if (query.product_id) {
      qb.andWhere('variant.product_id = :productId', {
        productId: query.product_id,
      });
    }
    if (query.product_variant_id) {
      qb.andWhere('inventory.product_variant_id = :variantId', {
        variantId: query.product_variant_id,
      });
    }
    if (query.channel) {
      qb.andWhere('inventory.channel = :channel', {
        channel: query.channel,
      });
    }
    if (query.low_stock === true) {
      qb.andWhere('inventory.available_stock <= :threshold', {
        threshold: this.lowStockThreshold,
      });
    }

    qb.select([
      'variant.product_id AS product_id',
      'product.name AS product_name',
      'inventory.product_variant_id AS product_variant_id',
      'variant.color AS variant_color',
      'variant.size AS variant_size',
      'inventory.channel AS channel',
      'inventory.available_stock AS available_stock',
      'inventory.reserved_stock AS reserved_stock',
      'inventory.updated_at AS updated_at',
    ])
      .orderBy('inventory.updated_at', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit);

    const [rows, total] = await Promise.all([
      qb.getRawMany<Record<string, unknown>>(),
      qb.getCount(),
    ]);

    const payload = { items: rows, total };
    this.listCache.set(key, {
      expiresAt: now + this.listCacheTtlMs,
      data: payload,
    });
    return payload;
  }

  async getInventoryByProductId(
    productId: string,
  ): Promise<Record<string, unknown>> {
    await this.ensureProductExists(productId);
    const variants = await this.variantsRepository.find({
      where: { productId },
      order: { sortOrder: 'ASC', id: 'ASC' },
    });
    const variantIds = variants.map((v) => v.id);
    const rows =
      variantIds.length === 0
        ? []
        : await this.inventoriesRepository.find({
            where: { productVariantId: In(variantIds) },
            order: { channel: 'ASC' },
          });
    const invByVariant = new Map<string, InventoryEntity[]>();
    for (const row of rows) {
      const list = invByVariant.get(row.productVariantId) ?? [];
      list.push(row);
      invByVariant.set(row.productVariantId, list);
    }

    return {
      product_id: productId,
      variants: variants.map((v) => ({
        product_variant_id: v.id,
        color: v.color,
        size: v.size,
        channels: (invByVariant.get(v.id) ?? []).map((item) => ({
          channel: item.channel,
          available_stock: item.availableStock,
          reserved_stock: item.reservedStock,
        })),
      })),
    };
  }

  async adjustInventory(
    productVariantId: string,
    payload: AdjustInventoryDto,
    actor: AuthenticatedUser,
  ): Promise<void> {
    const variant = await this.ensureVariantExists(productVariantId);
    let quantityBefore = 0;
    let quantityAfter = 0;
    await this.dataSource.transaction(async (manager) => {
      const stock = await this.getOrCreateInventoryForUpdate(
        manager.getRepository(InventoryEntity),
        productVariantId,
        payload.channel,
      );

      const delta =
        payload.type === InventoryMovementType.IN
          ? payload.quantity
          : -payload.quantity;
      const result = this.applyStockDelta(
        stock.availableStock,
        stock.reservedStock,
        delta,
      );

      stock.availableStock = result.availableStock;
      stock.reservedStock = result.reservedStock;
      await manager.save(stock);

      quantityBefore = result.beforeStock;
      quantityAfter = result.afterStock;

      await manager.save(
        manager.create(InventoryMovementEntity, {
          productVariantId,
          channel: payload.channel,
          type: payload.type,
          quantity: payload.quantity,
          beforeStock: result.beforeStock,
          afterStock: result.afterStock,
          reason: payload.reason,
          metadata: null,
        }),
      );
    });

    this.invalidateListCache();

    const entityLabel = await this.resolveVariantAuditLabel(productVariantId);
    await this.auditWriter.log({
      action: AuditAction.INVENTORY_ADJUST,
      entityType: AuditEntityType.INVENTORY,
      entityId: productVariantId,
      actor,
      entityLabel,
      metadata: {
        source: 'http',
        product_id: variant.productId,
        product_variant_id: productVariantId,
        channel: payload.channel,
        quantity_before: quantityBefore,
        quantity_after: quantityAfter,
        reason: 'manual' as InventoryAuditReason,
        movement_type: payload.type,
        note: payload.reason,
      },
    });
  }

  async listMovements(query: ListInventoryMovementsQueryDto): Promise<{
    items: InventoryMovementEntity[];
    total: number;
  }> {
    const qb = this.movementsRepository.createQueryBuilder('movement');
    if (query.product_variant_id) {
      qb.andWhere('movement.product_variant_id = :variantId', {
        variantId: query.product_variant_id,
      });
    }
    if (query.product_id) {
      qb.innerJoin(
        ProductVariantEntity,
        'pv',
        'pv.id = movement.product_variant_id',
      );
      qb.andWhere('pv.product_id = :productId', {
        productId: query.product_id,
      });
    }
    if (query.channel) {
      qb.andWhere('movement.channel = :channel', { channel: query.channel });
    }
    if (query.type) {
      qb.andWhere('movement.type = :type', { type: query.type });
    }
    if (query.from_date) {
      qb.andWhere('movement.created_at >= :fromDate', {
        fromDate: query.from_date,
      });
    }
    if (query.to_date) {
      qb.andWhere('movement.created_at <= :toDate', { toDate: query.to_date });
    }

    qb.orderBy('movement.created_at', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit);

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  async requestSync(
    payload: SyncInventoryDto,
    actor: AuthenticatedUser,
  ): Promise<void> {
    const mapping = await this.mappingsRepository.findOne({
      where: {
        productVariantId: payload.product_variant_id,
        channel: payload.channel,
        isActive: true,
      },
    });

    if (!mapping) {
      throw new BadRequestException({
        message: 'Product mapping not found for this channel',
        details: { code: 'MAPPING_NOT_FOUND' },
      });
    }

    await this.queuePort.enqueue(InventoryJobName.SYNC_STOCK, payload, {
      attempts: 5,
      backoffMs: 2000,
    });

    const variant = await this.ensureVariantExists(payload.product_variant_id);
    const syncLabel = `${await this.resolveProductAuditLabel(variant.productId)} · ${payload.channel}`;
    await this.auditWriter.log({
      action: AuditAction.INVENTORY_SYNC,
      entityType: AuditEntityType.INVENTORY,
      entityId: payload.product_variant_id,
      actor,
      entityLabel: syncLabel,
      metadata: {
        source: 'http',
        product_id: variant.productId,
        product_variant_id: payload.product_variant_id,
        channel: payload.channel,
        reason: 'manual' as InventoryAuditReason,
      },
    });
  }

  async reserveFromOrder(
    productVariantId: string,
    quantity: number,
    reason: string,
    orderId?: string,
  ): Promise<void> {
    await this.changeInternalStock(
      productVariantId,
      InventoryMovementType.RESERVE,
      quantity,
      reason,
      false,
      'order',
      orderId,
    );
  }

  async releaseFromOrder(
    productVariantId: string,
    quantity: number,
    reason: string,
    orderId?: string,
  ): Promise<void> {
    await this.changeInternalStock(
      productVariantId,
      InventoryMovementType.RELEASE,
      quantity,
      reason,
      false,
      'order',
      orderId,
    );
  }

  async commitOutFromOrder(
    productVariantId: string,
    quantity: number,
    reason: string,
    orderId?: string,
  ): Promise<void> {
    await this.changeInternalStock(
      productVariantId,
      InventoryMovementType.OUT,
      quantity,
      reason,
      true,
      'order',
      orderId,
    );
  }

  private async changeInternalStock(
    productVariantId: string,
    type: InventoryMovementType,
    quantity: number,
    reason: string,
    consumeReserved = false,
    stockReason: InventoryAuditReason = 'order',
    orderId?: string,
  ): Promise<void> {
    const variant = await this.ensureVariantExists(productVariantId);
    let beforeAvailable = 0;
    let afterAvailable = 0;
    await this.dataSource.transaction(async (manager) => {
      const stock = await this.getOrCreateInventoryForUpdate(
        manager.getRepository(InventoryEntity),
        productVariantId,
        InventoryChannel.INTERNAL,
      );

      const beforeStock = stock.availableStock;
      switch (type) {
        case InventoryMovementType.RESERVE:
          if (stock.availableStock < quantity) {
            throw new BadRequestException({
              message: 'Not enough stock available',
              details: { code: 'INSUFFICIENT_STOCK' },
            });
          }
          stock.availableStock -= quantity;
          stock.reservedStock += quantity;
          break;
        case InventoryMovementType.RELEASE:
          if (stock.reservedStock < quantity) {
            throw new BadRequestException({
              message: 'Reserved stock is insufficient',
              details: { code: 'INSUFFICIENT_RESERVED_STOCK' },
            });
          }
          stock.availableStock += quantity;
          stock.reservedStock -= quantity;
          break;
        case InventoryMovementType.OUT:
          if (consumeReserved) {
            if (stock.reservedStock < quantity) {
              throw new BadRequestException({
                message: 'Reserved stock is insufficient',
                details: { code: 'INSUFFICIENT_RESERVED_STOCK' },
              });
            }
            stock.reservedStock -= quantity;
          } else if (stock.availableStock < quantity) {
            throw new BadRequestException({
              message: 'Not enough stock available',
              details: { code: 'INSUFFICIENT_STOCK' },
            });
          } else {
            stock.availableStock -= quantity;
          }
          break;
        default:
          break;
      }

      await manager.save(stock);
      beforeAvailable = beforeStock;
      afterAvailable = stock.availableStock;
      await manager.save(
        manager.create(InventoryMovementEntity, {
          productVariantId,
          channel: InventoryChannel.INTERNAL,
          type,
          quantity,
          beforeStock,
          afterStock: stock.availableStock,
          reason,
          metadata: { reserved_stock: stock.reservedStock },
        }),
      );
    });

    this.invalidateListCache();

    let action: AuditActionCode = AuditAction.INVENTORY_ADJUST;
    if (type === InventoryMovementType.OUT) {
      action = AuditAction.INVENTORY_DEDUCT;
    } else if (type === InventoryMovementType.RELEASE) {
      action = AuditAction.INVENTORY_RESTOCK;
    }

    const entityLabel = await this.resolveVariantAuditLabel(productVariantId);
    const metaBase: Record<string, unknown> = {
      product_id: variant.productId,
      product_variant_id: productVariantId,
      channel: InventoryChannel.INTERNAL,
      quantity_before: beforeAvailable,
      quantity_after: afterAvailable,
      reason: stockReason,
      reason_detail: reason,
      movement_type: type,
    };
    if (orderId) {
      metaBase['order_id'] = orderId;
    }

    await this.auditWriter.log({
      action,
      entityType: AuditEntityType.INVENTORY,
      entityId: productVariantId,
      actor: null,
      entityLabel,
      metadata: metaBase,
      before: orderId ? { quantity: beforeAvailable, order_id: orderId } : null,
      after: orderId ? { quantity: afterAvailable, order_id: orderId } : null,
    });
  }

  private async getOrCreateInventoryForUpdate(
    repository: Repository<InventoryEntity>,
    productVariantId: string,
    channel: InventoryEntity['channel'],
  ): Promise<InventoryEntity> {
    let inventory = await repository
      .createQueryBuilder('inventory')
      .setLock('pessimistic_write')
      .where('inventory.product_variant_id = :variantId', {
        variantId: productVariantId,
      })
      .andWhere('inventory.channel = :channel', { channel })
      .getOne();

    if (!inventory) {
      inventory = repository.create({
        productVariantId,
        channel,
        availableStock: 0,
        reservedStock: 0,
      });
      await repository.save(inventory);
      inventory = await repository
        .createQueryBuilder('inventory')
        .setLock('pessimistic_write')
        .where('inventory.product_variant_id = :variantId', {
          variantId: productVariantId,
        })
        .andWhere('inventory.channel = :channel', { channel })
        .getOneOrFail();
    }
    return inventory;
  }

  private applyStockDelta(
    availableStock: number,
    reservedStock: number,
    delta: number,
  ): StockDeltaResult {
    const nextAvailable = availableStock + delta;
    if (nextAvailable < 0) {
      throw new BadRequestException({
        message: 'Not enough stock available',
        details: { code: 'INSUFFICIENT_STOCK' },
      });
    }
    return {
      beforeStock: availableStock,
      afterStock: nextAvailable,
      availableStock: nextAvailable,
      reservedStock,
    };
  }

  private async ensureProductExists(productId: string): Promise<void> {
    const product = await this.productsRepository.findOne({
      where: { id: productId },
    });
    if (!product || product.deletedAt) {
      throw new NotFoundException('Product not found');
    }
  }

  private async ensureVariantExists(
    productVariantId: string,
  ): Promise<ProductVariantEntity> {
    const variant = await this.variantsRepository.findOne({
      where: { id: productVariantId },
      relations: { product: true },
    });
    if (!variant || variant.product.deletedAt) {
      throw new NotFoundException('Product variant not found');
    }
    return variant;
  }

  private async resolveProductAuditLabel(productId: string): Promise<string> {
    const product = await this.productsRepository.findOne({
      where: { id: productId },
      select: { id: true, name: true, deletedAt: true },
    });
    if (!product || product.deletedAt) {
      return `Sản phẩm #${productId.slice(0, 8)}`;
    }
    return `${product.name} · #${productId.slice(0, 8)}`;
  }

  private async resolveVariantAuditLabel(
    productVariantId: string,
  ): Promise<string> {
    const variant = await this.variantsRepository.findOne({
      where: { id: productVariantId },
      relations: { product: true },
    });
    if (!variant || variant.product.deletedAt) {
      return `Biến thể #${productVariantId.slice(0, 8)}`;
    }
    return `${variant.product.name} · ${variant.color} / ${variant.size}`;
  }

  private invalidateListCache(): void {
    this.listCache.clear();
    this.logger.debug('Inventory list cache invalidated');
  }
}
