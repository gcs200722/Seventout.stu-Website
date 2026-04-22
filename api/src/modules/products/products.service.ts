import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import type { AuthenticatedUser } from '../auth/auth.types';
import {
  AuditAction,
  AuditEntityType,
  type AuditActionCode,
} from '../audit/audit.constants';
import { AuditWriterService } from '../audit/audit-writer.service';
import { CategoryEntity } from '../categories/category.entity';
import { InventoryEntity } from '../inventory/entities/inventory.entity';
import { InventoryChannel } from '../inventory/inventory.types';
import { ProductImageEntity } from './product-image.entity';
import { ProductEntity } from './product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import {
  ListProductsQueryDto,
  ProductSort,
} from './dto/list-products.query.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PromotionsApplicationService } from '../promotions/promotions.application.service';
import {
  extractS3ObjectKeyFromStoredImage,
  resolveStoredProductImageUrl,
} from '../storage/product-stored-image-url';
import { STORAGE_PORT } from '../storage/storage.constants';
import type { StoragePort } from '../storage/storage.port';

type UploadedImageFile = {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
};

export interface ProductListItemResponse {
  id: string;
  name: string;
  slug: string;
  price: number;
  thumbnail: string;
  category: {
    id: string;
    name: string;
    slug: string;
    parent: { id: string; name: string; slug: string } | null;
  };
  available_stock: number;
  is_active: boolean;
  created_at: string;
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
}

export interface ProductDetailResponse {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  category: {
    id: string;
    name: string;
    slug: string;
    parent: { id: string; name: string; slug: string } | null;
  };
  available_stock: number;
  images: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
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
}

export interface ProductStockResponse {
  product_id: string;
  available_stock: number;
}

@Injectable()
export class ProductsService {
  private readonly listCache = new Map<
    string,
    {
      expiresAt: number;
      data: { items: ProductListItemResponse[]; total: number };
    }
  >();
  private readonly listCacheTtlMs = 60_000;
  private readonly imageUrlTtlSeconds: number;

  constructor(
    @InjectRepository(ProductEntity)
    private readonly productsRepository: Repository<ProductEntity>,
    @InjectRepository(CategoryEntity)
    private readonly categoriesRepository: Repository<CategoryEntity>,
    @InjectRepository(InventoryEntity)
    private readonly inventoriesRepository: Repository<InventoryEntity>,
    @Inject(STORAGE_PORT)
    private readonly storageService: StoragePort,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
    private readonly promotionsApplication: PromotionsApplicationService,
    private readonly auditWriter: AuditWriterService,
  ) {
    this.imageUrlTtlSeconds = this.configService.get<number>(
      'AWS_S3_PRESIGNED_EXPIRES_SECONDS',
      900,
    );
  }

  async listProducts(
    query: ListProductsQueryDto,
  ): Promise<{ items: ProductListItemResponse[]; total: number }> {
    if (
      query.min_price !== undefined &&
      query.max_price !== undefined &&
      query.min_price > query.max_price
    ) {
      throw new BadRequestException({
        message: 'min_price cannot be greater than max_price',
        details: { code: 'INVALID_PRICE_RANGE' },
      });
    }

    const cacheKey = this.listCacheKey(query);
    const now = Date.now();
    const cached = this.listCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      return cached.data;
    }

    const qb = this.productsRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('category.parent', 'parentCategory')
      .where('product.deletedAt IS NULL')
      .andWhere('category.deletedAt IS NULL');

    if (query.category_id !== undefined) {
      const categoryIds = await this.resolveCategoryIdsForFilter(
        query.category_id,
      );
      qb.andWhere('product.categoryId IN (:...categoryIds)', {
        categoryIds,
      });
    }

    if (query.keyword !== undefined && query.keyword.length > 0) {
      qb.andWhere(
        '(LOWER(product.name) LIKE LOWER(:kw) OR LOWER(product.slug) LIKE LOWER(:kw))',
        { kw: `%${query.keyword}%` },
      );
    }

    if (query.min_price !== undefined) {
      qb.andWhere('product.price >= :minPrice', {
        minPrice: query.min_price,
      });
    }

    if (query.max_price !== undefined) {
      qb.andWhere('product.price <= :maxPrice', {
        maxPrice: query.max_price,
      });
    }

    if (query.is_active !== undefined) {
      qb.andWhere('product.isActive = :isActive', {
        isActive: query.is_active,
      });
    }

    switch (query.sort) {
      case ProductSort.PRICE_ASC:
        qb.orderBy('product.price', 'ASC').addOrderBy('product.id', 'ASC');
        break;
      case ProductSort.PRICE_DESC:
        qb.orderBy('product.price', 'DESC').addOrderBy('product.id', 'DESC');
        break;
      case ProductSort.NEWEST:
      default:
        qb.orderBy('product.createdAt', 'DESC').addOrderBy(
          'product.id',
          'DESC',
        );
        break;
    }

    qb.skip((query.page - 1) * query.limit).take(query.limit);

    const [rows, total] = await qb.getManyAndCount();
    const stockByProductId = await this.getInternalStockMap(
      rows.map((item) => item.id),
    );

    const itemsBase = await Promise.all(
      rows.map(async (product) => ({
        id: product.id,
        name: product.name,
        slug: product.slug,
        price: product.price,
        thumbnail: await this.resolveImageUrl(product.thumbnail),
        category: {
          id: product.category.id,
          name: product.category.name,
          slug: product.category.slug,
          parent: product.category.parent
            ? {
                id: product.category.parent.id,
                name: product.category.parent.name,
                slug: product.category.parent.slug,
              }
            : null,
        },
        available_stock: stockByProductId[product.id] ?? 0,
        is_active: product.isActive,
        created_at: product.createdAt.toISOString(),
      })),
    );

    let items = itemsBase;
    try {
      const previews =
        await this.promotionsApplication.previewCatalogPromotionsForProducts(
          itemsBase.map((i) => ({
            productId: i.id,
            categoryId: i.category.id,
            unitPrice: i.price,
          })),
        );
      items = itemsBase.map((i) => {
        const preview = previews[i.id];
        if (
          !preview ||
          preview.discount_amount <= 0 ||
          !preview.campaign_name
        ) {
          return i;
        }
        return {
          ...i,
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

    const payload = { items, total };
    this.listCache.set(cacheKey, {
      data: payload,
      expiresAt: now + this.listCacheTtlMs,
    });

    return payload;
  }

  async getProductById(id: string): Promise<ProductDetailResponse> {
    const product = await this.productsRepository.findOne({
      where: { id },
      relations: {
        category: { parent: true },
        images: true,
      },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const sortedImages = [...(product.images ?? [])].sort(
      (a, b) => a.sortOrder - b.sortOrder,
    );
    const internalStock = await this.inventoriesRepository.findOne({
      where: {
        productId: product.id,
        channel: InventoryChannel.INTERNAL,
      },
    });

    const base: ProductDetailResponse = {
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      price: product.price,
      category: {
        id: product.category.id,
        name: product.category.name,
        slug: product.category.slug,
        parent: product.category.parent
          ? {
              id: product.category.parent.id,
              name: product.category.parent.name,
              slug: product.category.parent.slug,
            }
          : null,
      },
      available_stock: internalStock?.availableStock ?? 0,
      images: await Promise.all(
        sortedImages.map((img) => this.resolveImageUrl(img.imageUrl)),
      ),
      is_active: product.isActive,
      created_at: product.createdAt.toISOString(),
      updated_at: product.updatedAt.toISOString(),
    };

    try {
      const previews =
        await this.promotionsApplication.previewCatalogPromotionsForProducts([
          {
            productId: product.id,
            categoryId: product.category.id,
            unitPrice: product.price,
          },
        ]);
      const preview = previews[product.id];
      if (preview && preview.discount_amount > 0 && preview.campaign_name) {
        return {
          ...base,
          promotion: {
            campaign_name: preview.campaign_name,
            list_price: preview.list_price,
            sale_price: preview.sale_price,
            ...(preview.conditions_display
              ? { conditions_display: preview.conditions_display }
              : {}),
          },
        };
      }
    } catch {
      /* promotion preview is best-effort */
    }

    return base;
  }

  async getProductsByIdsPublic(
    ids: string[],
  ): Promise<ProductDetailResponse[]> {
    const unique = [...new Set(ids)].filter(Boolean).slice(0, 48);
    const out: ProductDetailResponse[] = [];
    for (const id of unique) {
      try {
        // Sequential keeps code small; batch size capped for CMS home.

        out.push(await this.getProductById(id));
      } catch {
        /* skip missing */
      }
    }
    return out;
  }

  async getProductBySlug(slug: string): Promise<ProductDetailResponse> {
    const normalizedSlug = slug.trim().toLowerCase();
    const product = await this.productsRepository.findOne({
      where: { slug: normalizedSlug },
      select: { id: true },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return this.getProductById(product.id);
  }

  async getProductStockById(productId: string): Promise<ProductStockResponse> {
    const stockByProductId = await this.getInternalStockMap([productId]);
    return {
      product_id: productId,
      available_stock: stockByProductId[productId] ?? 0,
    };
  }

  async getProductStocks(
    productIds: string[],
  ): Promise<ProductStockResponse[]> {
    const stockByProductId = await this.getInternalStockMap(productIds);
    return productIds.map((productId) => ({
      product_id: productId,
      available_stock: stockByProductId[productId] ?? 0,
    }));
  }

  async createProduct(
    payload: CreateProductDto,
    imageFiles: UploadedImageFile[] = [],
    actor: AuthenticatedUser,
  ): Promise<void> {
    const uploadedKeys = await this.uploadImages(payload.name, imageFiles);
    const imageUrls = [
      ...(payload.images ?? []).map((image) =>
        this.normalizeStoredImageValue(image),
      ),
      ...uploadedKeys,
    ];
    if (imageUrls.length === 0) {
      throw new BadRequestException({
        message: 'At least one product image is required',
        details: { code: 'MISSING_IMAGES' },
      });
    }

    const category = await this.categoriesRepository.findOne({
      where: { id: payload.category_id },
    });
    if (!category || category.deletedAt) {
      throw new NotFoundException('Category not found');
    }
    if (category.level !== 2) {
      throw new BadRequestException({
        message: 'Category must be a subcategory (level 2)',
        details: { code: 'INVALID_CATEGORY' },
      });
    }

    const slug = await this.ensureUniqueSlug(this.slugify(payload.name));
    const thumbnail = imageUrls[0];

    let newProductId = '';
    await this.dataSource.transaction(async (manager) => {
      const product = manager.create(ProductEntity, {
        name: payload.name,
        slug,
        description: payload.description,
        price: payload.price,
        categoryId: payload.category_id,
        thumbnail,
        isActive: true,
      });
      const saved = await manager.save(product);
      newProductId = saved.id;

      const imageEntities = imageUrls.map((url, index) =>
        manager.create(ProductImageEntity, {
          productId: saved.id,
          imageUrl: url,
          isThumbnail: index === 0,
          sortOrder: index,
        }),
      );
      await manager.save(imageEntities);
    });

    this.invalidateListCache();

    await this.auditWriter.log({
      action: AuditAction.CREATE,
      entityType: AuditEntityType.PRODUCT,
      entityId: newProductId,
      actor,
      entityLabel: payload.name,
      metadata: { source: 'http' },
      before: null,
      after: {
        name: payload.name,
        price: payload.price,
        is_active: true,
      },
    });
  }

  async updateProduct(
    id: string,
    payload: UpdateProductDto,
    imageFiles: UploadedImageFile[] = [],
    actor: AuthenticatedUser,
  ): Promise<void> {
    const product = await this.productsRepository.findOne({
      where: { id },
      relations: { images: true },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const beforeSnapshot = this.productAuditSnapshot(product);

    const resolvedName = payload.name ?? product.name;
    const uploadedKeys = await this.uploadImages(resolvedName, imageFiles);
    const shouldReplaceImages =
      payload.images !== undefined || uploadedKeys.length > 0;

    if (payload.name !== undefined && payload.name !== product.name) {
      product.name = payload.name;
      product.slug = await this.ensureUniqueSlug(
        this.slugify(payload.name),
        product.id,
      );
    }
    if (payload.description !== undefined) {
      product.description = payload.description;
    }
    if (payload.price !== undefined) {
      product.price = payload.price;
    }
    if (payload.is_active !== undefined) {
      product.isActive = payload.is_active;
    }

    if (shouldReplaceImages) {
      const replacedImages = [
        ...(payload.images ?? []).map((image) =>
          this.normalizeStoredImageValue(image),
        ),
        ...uploadedKeys,
      ];
      if (replacedImages.length === 0) {
        throw new BadRequestException({
          message: 'At least one product image is required',
          details: { code: 'MISSING_IMAGES' },
        });
      }
      const requestedMainIndex = payload.main_image_index ?? 0;
      const mainImageIndex = Math.max(
        0,
        Math.min(requestedMainIndex, replacedImages.length - 1),
      );
      product.thumbnail = replacedImages[mainImageIndex];

      await this.dataSource.transaction(async (manager) => {
        await manager.save(product);
        await manager.delete(ProductImageEntity, { productId: product.id });
        const imageEntities = replacedImages.map((image, index) =>
          manager.create(ProductImageEntity, {
            productId: product.id,
            imageUrl: image,
            isThumbnail: index === mainImageIndex,
            sortOrder: index,
          }),
        );
        await manager.save(imageEntities);
      });
    }

    if (!shouldReplaceImages) {
      await this.productsRepository.save(product);
    }
    this.invalidateListCache();

    const afterSnapshot = this.productAuditSnapshot(product);
    if (JSON.stringify(beforeSnapshot) !== JSON.stringify(afterSnapshot)) {
      let action: AuditActionCode = AuditAction.UPDATE;
      if (beforeSnapshot.price !== afterSnapshot.price) {
        action = AuditAction.PRICE_CHANGE;
      } else if (beforeSnapshot.is_active !== afterSnapshot.is_active) {
        action = AuditAction.STATUS_CHANGE;
      }
      await this.auditWriter.log({
        action,
        entityType: AuditEntityType.PRODUCT,
        entityId: id,
        actor,
        entityLabel: product.name,
        metadata: { source: 'http' },
        before: beforeSnapshot,
        after: afterSnapshot,
      });
    }
  }

  async softDeleteProduct(id: string, actor: AuthenticatedUser): Promise<void> {
    const product = await this.productsRepository.findOne({
      where: { id },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const count = await this.countOrderItemsForProduct(id);
    if (count > 0) {
      throw new BadRequestException({
        message: 'Product cannot be deleted while referenced by orders',
        details: { code: 'PRODUCT_IN_ORDER' },
      });
    }

    await this.productsRepository.softDelete(id);
    this.invalidateListCache();

    await this.auditWriter.log({
      action: AuditAction.DELETE,
      entityType: AuditEntityType.PRODUCT,
      entityId: id,
      actor,
      entityLabel: product.name,
      metadata: { source: 'http' },
      before: this.productAuditSnapshot(product),
      after: null,
    });
  }

  private productAuditSnapshot(product: ProductEntity): {
    name: string;
    price: number;
    is_active: boolean;
  } {
    return {
      name: product.name,
      price: product.price,
      is_active: product.isActive,
    };
  }

  private async countOrderItemsForProduct(productId: string): Promise<number> {
    const result: Array<{ count: string | number }> =
      await this.dataSource.query(
        'SELECT COUNT(*)::int AS count FROM order_items WHERE product_id = $1',
        [productId],
      );
    return Number(result[0]?.count ?? 0);
  }

  private listCacheKey(query: ListProductsQueryDto): string {
    return JSON.stringify({
      page: query.page,
      limit: query.limit,
      category_id: query.category_id ?? null,
      keyword: query.keyword ?? null,
      min_price: query.min_price ?? null,
      max_price: query.max_price ?? null,
      is_active: query.is_active ?? null,
      sort: query.sort,
    });
  }

  private invalidateListCache(): void {
    this.listCache.clear();
  }

  private async resolveCategoryIdsForFilter(
    categoryId: string,
  ): Promise<string[]> {
    const category = await this.categoriesRepository.findOne({
      where: { id: categoryId },
      select: { id: true, level: true },
    });

    if (!category || category.level !== 1) {
      return [categoryId];
    }

    const children = await this.categoriesRepository.find({
      where: { parentId: category.id },
      select: { id: true },
    });

    return [category.id, ...children.map((child) => child.id)];
  }

  private async ensureUniqueSlug(
    baseSlug: string,
    excludeId?: string,
  ): Promise<string> {
    let candidate = baseSlug;
    let suffix = 1;

    while (true) {
      const queryBuilder = this.productsRepository
        .createQueryBuilder('product')
        .where('product.deleted_at IS NULL')
        .andWhere('product.slug = :slug', { slug: candidate });

      if (excludeId) {
        queryBuilder.andWhere('product.id != :excludeId', {
          excludeId,
        });
      }

      const duplicated = await queryBuilder.getOne();
      if (!duplicated) {
        return candidate;
      }
      suffix += 1;
      candidate = `${baseSlug}-${suffix}`;
    }
  }

  private slugify(value: string): string {
    const sanitized = value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
    return sanitized || 'product';
  }

  private async uploadImages(
    productName: string,
    files: UploadedImageFile[],
  ): Promise<string[]> {
    if (!files || files.length === 0) {
      return [];
    }

    const now = Date.now();
    const uploaded: string[] = [];
    const productFolder = this.slugify(productName);
    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      const ext = this.fileExtensionFrom(file.originalname, file.mimetype);
      const key = `products/${productFolder}/${now}-${index + 1}.${ext}`;
      await this.storageService.putObject(key, file.buffer, {
        contentType: file.mimetype,
      });
      uploaded.push(key);
    }
    return uploaded;
  }

  private fileExtensionFrom(name: string, mimeType: string): string {
    const fromName = name.split('.').pop();
    if (fromName && fromName.length <= 5) {
      return fromName.toLowerCase();
    }
    if (mimeType === 'image/png') {
      return 'png';
    }
    if (mimeType === 'image/webp') {
      return 'webp';
    }
    return 'jpg';
  }

  private async resolveImageUrl(value: string): Promise<string> {
    return resolveStoredProductImageUrl(
      this.storageService,
      value,
      this.imageUrlTtlSeconds,
      this.configService.get<string>('AWS_S3_BUCKET'),
    );
  }

  private normalizeStoredImageValue(value: string): string {
    return (
      extractS3ObjectKeyFromStoredImage(
        value,
        this.configService.get<string>('AWS_S3_BUCKET'),
      ) ?? value
    );
  }

  private async getInternalStockMap(
    productIds: string[],
  ): Promise<Record<string, number>> {
    if (productIds.length === 0) {
      return {};
    }
    const rows = await this.inventoriesRepository.find({
      where: productIds.map((productId) => ({
        productId,
        channel: InventoryChannel.INTERNAL,
      })),
    });
    return rows.reduce<Record<string, number>>((acc, row) => {
      acc[row.productId] = row.availableStock;
      return acc;
    }, {});
  }
}
