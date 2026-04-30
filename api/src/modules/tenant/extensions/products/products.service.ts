import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import type { AuthenticatedUser } from '../../core/auth/auth.types';
import {
  AuditAction,
  AuditEntityType,
  type AuditActionCode,
} from '../../core/audit/audit.constants';
import { AuditWriterService } from '../../core/audit/audit-writer.service';
import { TenantContextService } from '../../core/context/tenant-context.service';
import { forTenantQb } from '../../core/context/for-tenant.util';
import { CategoryEntity } from '../categories/category.entity';
import { InventoryEntity } from '../inventory/entities/inventory.entity';
import { InventoryChannel } from '../inventory/inventory.types';
import { ProductImageEntity } from './product-image.entity';
import { ProductEntity } from './product.entity';
import { ProductVariantEntity } from './product-variant.entity';
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
} from '../../core/storage/product-stored-image-url';
import { STORAGE_PORT } from '../../core/storage/storage.constants';
import type { StoragePort } from '../../core/storage/storage.port';

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
  default_variant_id: string;
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
  default_variant_id: string;
  variants: Array<{
    id: string;
    color: string;
    size: string;
    available_stock: number;
    sort_order: number;
  }>;
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
  variants: Array<{
    product_variant_id: string;
    available_stock: number;
  }>;
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
    @InjectRepository(ProductVariantEntity)
    private readonly variantsRepository: Repository<ProductVariantEntity>,
    @Inject(STORAGE_PORT)
    private readonly storageService: StoragePort,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
    private readonly promotionsApplication: PromotionsApplicationService,
    private readonly auditWriter: AuditWriterService,
    private readonly tenantContext: TenantContextService,
  ) {
    this.imageUrlTtlSeconds = this.configService.get<number>(
      'AWS_S3_PRESIGNED_EXPIRES_SECONDS',
      900,
    );
  }

  async listProducts(
    query: ListProductsQueryDto,
  ): Promise<{ items: ProductListItemResponse[]; total: number }> {
    const tenantId = this.tenantContext.requireTenantId();
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

    const cacheKey = this.listCacheKey(tenantId, query);
    const now = Date.now();
    const cached = this.listCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      return cached.data;
    }

    const qb = forTenantQb(
      this.productsRepository
        .createQueryBuilder('product')
        .leftJoinAndSelect('product.category', 'category')
        .leftJoinAndSelect('category.parent', 'parentCategory')
        .where('product.deletedAt IS NULL')
        .andWhere('category.deletedAt IS NULL'),
      'product',
      tenantId,
    );

    if (query.category_id !== undefined) {
      const categoryIds = await this.resolveCategoryIdsForFilter(
        tenantId,
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
    const productIds = rows.map((item) => item.id);
    const { sumByProductId } = await this.getInternalStockAggregates(
      productIds,
      tenantId,
    );
    const defaultVariantByProduct = await this.resolveDefaultVariantIds(
      productIds,
      tenantId,
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
        available_stock: sumByProductId[product.id] ?? 0,
        default_variant_id: defaultVariantByProduct.get(product.id) ?? '',
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
    const tenantId = this.tenantContext.requireTenantId();
    const product = await this.productsRepository.findOne({
      where: { id, tenantId },
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
    const variants = await this.variantsRepository.find({
      where: { productId: product.id, tenantId },
      order: { sortOrder: 'ASC', id: 'ASC' },
    });
    const { sumByProductId, stockByVariantId } =
      await this.getInternalStockAggregates([product.id], tenantId);
    const variantRows = variants.map((v) => ({
      id: v.id,
      color: v.color,
      size: v.size,
      available_stock: stockByVariantId[v.id] ?? 0,
      sort_order: v.sortOrder,
    }));
    const defaultVariantId = variantRows[0]?.id ?? '';

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
      available_stock: sumByProductId[product.id] ?? 0,
      default_variant_id: defaultVariantId,
      variants: variantRows,
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
    const tenantId = this.tenantContext.requireTenantId();
    const normalizedSlug = slug.trim().toLowerCase();
    const product = await this.productsRepository.findOne({
      where: { slug: normalizedSlug, tenantId },
      select: { id: true },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return this.getProductById(product.id);
  }

  async getProductStockById(productId: string): Promise<ProductStockResponse> {
    const tenantId = this.tenantContext.requireTenantId();
    const { sumByProductId, stockByVariantId } =
      await this.getInternalStockAggregates([productId], tenantId);
    const variants = await this.variantsRepository.find({
      where: { productId, tenantId },
      order: { sortOrder: 'ASC', id: 'ASC' },
    });
    return {
      product_id: productId,
      available_stock: sumByProductId[productId] ?? 0,
      variants: variants.map((v) => ({
        product_variant_id: v.id,
        available_stock: stockByVariantId[v.id] ?? 0,
      })),
    };
  }

  async getProductStocks(
    productIds: string[],
  ): Promise<ProductStockResponse[]> {
    const tenantId = this.tenantContext.requireTenantId();
    const { sumByProductId, stockByVariantId } =
      await this.getInternalStockAggregates(productIds, tenantId);
    const variants = await this.variantsRepository.find({
      where: { productId: In(productIds), tenantId },
      order: { sortOrder: 'ASC', id: 'ASC' },
    });
    const variantsByProduct = new Map<string, ProductVariantEntity[]>();
    for (const v of variants) {
      const list = variantsByProduct.get(v.productId) ?? [];
      list.push(v);
      variantsByProduct.set(v.productId, list);
    }
    return productIds.map((productId) => ({
      product_id: productId,
      available_stock: sumByProductId[productId] ?? 0,
      variants: (variantsByProduct.get(productId) ?? []).map((v) => ({
        product_variant_id: v.id,
        available_stock: stockByVariantId[v.id] ?? 0,
      })),
    }));
  }

  async createProduct(
    payload: CreateProductDto,
    imageFiles: UploadedImageFile[] = [],
    actor: AuthenticatedUser,
  ): Promise<void> {
    const tenantId = await this.tenantContext.requireTenantIdOrDefault();
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
      where: { id: payload.category_id, tenantId },
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

    const slug = await this.ensureUniqueSlug(
      tenantId,
      this.slugify(payload.name),
    );
    const thumbnail = imageUrls[0];

    let newProductId = '';
    await this.dataSource.transaction(async (manager) => {
      const product = manager.create(ProductEntity, {
        name: payload.name,
        tenantId,
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
          tenantId,
          imageUrl: url,
          isThumbnail: index === 0,
          sortOrder: index,
        }),
      );
      await manager.save(imageEntities);

      await manager.save(
        manager.create(ProductVariantEntity, {
          productId: saved.id,
          tenantId,
          color: 'Mặc định',
          size: '-',
          sortOrder: 0,
        }),
      );
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
    const tenantId = await this.tenantContext.requireTenantIdOrDefault();
    const product = await this.productsRepository.findOne({
      where: { id, tenantId },
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
        tenantId,
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
            tenantId,
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
    const tenantId = await this.tenantContext.requireTenantIdOrDefault();
    const product = await this.productsRepository.findOne({
      where: { id, tenantId },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const count = await this.countOrderItemsForProduct(id, tenantId);
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

  private async countOrderItemsForProduct(
    productId: string,
    tenantId: string,
  ): Promise<number> {
    const columns: Array<{ column_name: string }> = await this.dataSource.query(
      `
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'order_items'
      `,
    );
    const hasTenantId = new Set(columns.map((col) => col.column_name)).has(
      'tenant_id',
    );
    const sql = hasTenantId
      ? 'SELECT COUNT(*)::int AS count FROM order_items WHERE product_id = $1 AND tenant_id = $2'
      : 'SELECT COUNT(*)::int AS count FROM order_items WHERE product_id = $1';
    const result: Array<{ count: string | number }> =
      await this.dataSource.query(
        sql,
        hasTenantId ? [productId, tenantId] : [productId],
      );
    return Number(result[0]?.count ?? 0);
  }

  private listCacheKey(tenantId: string, query: ListProductsQueryDto): string {
    return JSON.stringify({
      tenant_id: tenantId,
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
    tenantId: string,
    categoryId: string,
  ): Promise<string[]> {
    const category = await this.categoriesRepository.findOne({
      where: { id: categoryId, tenantId },
      select: { id: true, level: true },
    });

    if (!category || category.level !== 1) {
      return [categoryId];
    }

    const children = await this.categoriesRepository.find({
      where: { parentId: category.id, tenantId },
      select: { id: true },
    });

    return [category.id, ...children.map((child) => child.id)];
  }

  private async ensureUniqueSlug(
    tenantId: string,
    baseSlug: string,
    excludeId?: string,
  ): Promise<string> {
    let candidate = baseSlug;
    let suffix = 1;

    while (true) {
      const queryBuilder = this.productsRepository
        .createQueryBuilder('product')
        .where('product.deleted_at IS NULL')
        .andWhere('product.tenant_id = :tenantId', { tenantId })
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

  private async getInternalStockAggregates(
    productIds: string[],
    tenantId: string,
  ): Promise<{
    sumByProductId: Record<string, number>;
    stockByVariantId: Record<string, number>;
  }> {
    if (productIds.length === 0) {
      return { sumByProductId: {}, stockByVariantId: {} };
    }
    const rawRows: unknown = await this.dataSource.query(
      `SELECT v.product_id AS "productId", v.id AS "variantId",
              COALESCE(i.available_stock, 0) AS stock
       FROM inventories i
       INNER JOIN product_variants v ON v.id = i.product_variant_id
       WHERE i.channel = $1 AND v.product_id = ANY($2::uuid[]) AND i.tenant_id = $3`,
      [InventoryChannel.INTERNAL, productIds, tenantId],
    );

    const sumByProductId: Record<string, number> = {};
    const stockByVariantId: Record<string, number> = {};
    const rows = Array.isArray(rawRows) ? rawRows : [];
    for (const row of rows) {
      if (!row || typeof row !== 'object') {
        continue;
      }
      const data = row as Record<string, unknown>;
      const productId = data.productId;
      const variantId = data.variantId;
      if (typeof productId !== 'string' || typeof variantId !== 'string') {
        continue;
      }
      const s = Number(data.stock);
      stockByVariantId[variantId] = s;
      sumByProductId[productId] = (sumByProductId[productId] ?? 0) + s;
    }
    return { sumByProductId, stockByVariantId };
  }

  private async resolveDefaultVariantIds(
    productIds: string[],
    tenantId: string,
  ): Promise<Map<string, string>> {
    const map = new Map<string, string>();
    if (productIds.length === 0) {
      return map;
    }
    const variants = await this.variantsRepository.find({
      where: {
        productId: In(productIds),
        tenantId,
      },
      order: { sortOrder: 'ASC', id: 'ASC' },
    });
    for (const v of variants) {
      if (!map.has(v.productId)) {
        map.set(v.productId, v.id);
      }
    }
    return map;
  }

  async addProductVariant(
    productId: string,
    payload: { color: string; size: string; sort_order?: number },
    actor: AuthenticatedUser,
  ): Promise<{ id: string }> {
    const tenantId = await this.tenantContext.requireTenantIdOrDefault();
    const product = await this.productsRepository.findOne({
      where: { id: productId, tenantId },
    });
    if (!product || product.deletedAt) {
      throw new NotFoundException('Product not found');
    }
    const color = payload.color.trim();
    const size = payload.size.trim();
    if (!color.length || !size.length) {
      throw new BadRequestException({
        message: 'Color and size are required',
        details: { code: 'INVALID_VARIANT' },
      });
    }
    const maxRow = await this.variantsRepository
      .createQueryBuilder('v')
      .select('MAX(v.sort_order)', 'max')
      .where('v.product_id = :pid', { pid: productId })
      .andWhere('v.tenant_id = :tenantId', {
        tenantId,
      })
      .getRawOne<{ max: string | null }>();
    const nextSort = Number(maxRow?.max ?? 0) + 1;
    const sortOrder =
      payload.sort_order !== undefined && Number.isFinite(payload.sort_order)
        ? payload.sort_order
        : nextSort;
    try {
      const row = await this.variantsRepository.save(
        this.variantsRepository.create({
          productId,
          tenantId,
          color,
          size,
          sortOrder,
        }),
      );
      await this.auditWriter.log({
        action: AuditAction.UPDATE,
        entityType: AuditEntityType.PRODUCT,
        entityId: productId,
        actor,
        entityLabel: product.name,
        metadata: { source: 'http', variant_id: row.id, color, size },
        before: null,
        after: { variant_id: row.id },
      });
      this.invalidateListCache();
      return { id: row.id };
    } catch {
      throw new BadRequestException({
        message: 'A variant with this color and size already exists',
        details: { code: 'DUPLICATE_VARIANT' },
      });
    }
  }

  async updateProductVariant(
    productId: string,
    variantId: string,
    payload: { color?: string; size?: string; sort_order?: number },
    actor: AuthenticatedUser,
  ): Promise<void> {
    const tenantId = await this.tenantContext.requireTenantIdOrDefault();
    const variant = await this.variantsRepository.findOne({
      where: {
        id: variantId,
        productId,
        tenantId,
      },
      relations: { product: true },
    });
    if (!variant || variant.product?.deletedAt) {
      throw new NotFoundException('Variant not found');
    }
    const nextColor =
      payload.color !== undefined ? payload.color.trim() : variant.color;
    const nextSize =
      payload.size !== undefined ? payload.size.trim() : variant.size;
    if (!nextColor.length || !nextSize.length) {
      throw new BadRequestException({
        message: 'Color and size are required',
        details: { code: 'INVALID_VARIANT' },
      });
    }
    if (
      payload.sort_order !== undefined &&
      !Number.isFinite(payload.sort_order)
    ) {
      throw new BadRequestException({
        message: 'sort_order must be a valid number',
        details: { code: 'INVALID_SORT_ORDER' },
      });
    }
    const before = {
      color: variant.color,
      size: variant.size,
      sort_order: variant.sortOrder,
    };
    variant.color = nextColor;
    variant.size = nextSize;
    if (payload.sort_order !== undefined) {
      variant.sortOrder = payload.sort_order;
    }
    try {
      await this.variantsRepository.save(variant);
      await this.auditWriter.log({
        action: AuditAction.UPDATE,
        entityType: AuditEntityType.PRODUCT,
        entityId: productId,
        actor,
        entityLabel: variant.product.name,
        metadata: { source: 'http', variant_id: variantId },
        before,
        after: {
          color: variant.color,
          size: variant.size,
          sort_order: variant.sortOrder,
        },
      });
      this.invalidateListCache();
    } catch {
      throw new BadRequestException({
        message: 'A variant with this color and size already exists',
        details: { code: 'DUPLICATE_VARIANT' },
      });
    }
  }

  async deleteProductVariant(
    productId: string,
    variantId: string,
    actor: AuthenticatedUser,
  ): Promise<void> {
    const tenantId = await this.tenantContext.requireTenantIdOrDefault();
    const variant = await this.variantsRepository.findOne({
      where: {
        id: variantId,
        productId,
        tenantId,
      },
      relations: { product: true },
    });
    if (!variant || variant.product?.deletedAt) {
      throw new NotFoundException('Variant not found');
    }
    const variantsCount = await this.variantsRepository.count({
      where: { productId, tenantId },
    });
    if (variantsCount <= 1) {
      throw new BadRequestException({
        message: 'Product must have at least one variant',
        details: { code: 'MIN_VARIANT_REQUIRED' },
      });
    }
    try {
      await this.variantsRepository.delete({ id: variantId, productId });
      await this.auditWriter.log({
        action: AuditAction.UPDATE,
        entityType: AuditEntityType.PRODUCT,
        entityId: productId,
        actor,
        entityLabel: variant.product.name,
        metadata: { source: 'http', variant_id: variantId, removed: true },
        before: {
          color: variant.color,
          size: variant.size,
          sort_order: variant.sortOrder,
        },
        after: null,
      });
      this.invalidateListCache();
    } catch {
      throw new BadRequestException({
        message:
          'Cannot delete variant because it is referenced by inventory/cart/order data',
        details: { code: 'VARIANT_IN_USE' },
      });
    }
  }
}
