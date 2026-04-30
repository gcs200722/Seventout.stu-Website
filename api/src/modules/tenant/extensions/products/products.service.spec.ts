import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource, Repository } from 'typeorm';
import type { AuthenticatedUser } from '../../core/auth/auth.types';
import { UserRole } from '../../core/authorization/authorization.types';
import { AuditWriterService } from '../../core/audit/audit-writer.service';
import { CategoryEntity } from '../categories/category.entity';
import { InventoryEntity } from '../inventory/entities/inventory.entity';
import { StoragePort } from '../../core/storage/storage.port';
import { PromotionsApplicationService } from '../promotions/promotions.application.service';
import { ProductEntity } from './product.entity';
import { ProductVariantEntity } from './product-variant.entity';
import { ProductsService } from './products.service';
import { ProductSort } from './dto/list-products.query.dto';
import type { TenantContextService } from '../../core/context/tenant-context.service';

const TENANT_ID = 'tenant-test-1';

type QueryBuilderMock = {
  leftJoinAndSelect: jest.Mock;
  where: jest.Mock;
  andWhere: jest.Mock;
  orderBy: jest.Mock;
  addOrderBy: jest.Mock;
  skip: jest.Mock;
  take: jest.Mock;
  getManyAndCount: jest.Mock;
};

function buildListQueryBuilderMock(): QueryBuilderMock {
  const builder = {
    leftJoinAndSelect: jest.fn(),
    where: jest.fn(),
    andWhere: jest.fn(),
    orderBy: jest.fn(),
    addOrderBy: jest.fn(),
    skip: jest.fn(),
    take: jest.fn(),
    getManyAndCount: jest.fn(),
  };
  builder.leftJoinAndSelect.mockReturnValue(builder);
  builder.where.mockReturnValue(builder);
  builder.andWhere.mockReturnValue(builder);
  builder.orderBy.mockReturnValue(builder);
  builder.addOrderBy.mockReturnValue(builder);
  builder.skip.mockReturnValue(builder);
  builder.take.mockReturnValue(builder);
  return builder;
}

function buildSlugQueryBuilderMock(): {
  where: jest.Mock;
  andWhere: jest.Mock;
  getOne: jest.Mock;
} {
  const builder = {
    where: jest.fn(),
    andWhere: jest.fn(),
    getOne: jest.fn(),
  };
  builder.where.mockReturnValue(builder);
  builder.andWhere.mockReturnValue(builder);
  return builder;
}

const testActor: AuthenticatedUser = {
  id: 'admin-1',
  email: 'admin@test.com',
  role: UserRole.ADMIN,
  permissions: [],
};

describe('ProductsService', () => {
  let service: ProductsService;
  let productsRepository: jest.Mocked<Repository<ProductEntity>>;
  let categoriesRepository: jest.Mocked<Repository<CategoryEntity>>;
  let inventoriesRepository: jest.Mocked<Repository<InventoryEntity>>;
  let variantsRepository: jest.Mocked<Repository<ProductVariantEntity>>;
  let storageService: jest.Mocked<StoragePort>;
  let configService: jest.Mocked<ConfigService>;
  let dataSource: jest.Mocked<DataSource>;
  let promotionsApplication: jest.Mocked<
    Pick<PromotionsApplicationService, 'previewCatalogPromotionsForProducts'>
  >;
  let auditWriter: { log: jest.Mock };
  let tenantContext: jest.Mocked<
    Pick<TenantContextService, 'requireTenantId' | 'requireTenantIdOrDefault'>
  >;

  beforeEach(() => {
    productsRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
      softDelete: jest.fn(),
      createQueryBuilder: jest.fn(),
    } as unknown as jest.Mocked<Repository<ProductEntity>>;
    categoriesRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
    } as unknown as jest.Mocked<Repository<CategoryEntity>>;
    inventoriesRepository = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
    } as unknown as jest.Mocked<Repository<InventoryEntity>>;
    variantsRepository = {
      find: jest.fn().mockResolvedValue([]),
      save: jest.fn(),
      create: jest.fn((x: unknown) => x),
      createQueryBuilder: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ max: '0' }),
      }),
    } as unknown as jest.Mocked<Repository<ProductVariantEntity>>;
    storageService = {
      putObject: jest.fn(),
      getSignedDownloadUrl: jest
        .fn()
        .mockResolvedValue('https://signed.example.com/img'),
      getSignedPutUrl: jest
        .fn()
        .mockResolvedValue('https://signed-put.example.com/object'),
    } as unknown as jest.Mocked<StoragePort>;
    configService = {
      get: jest.fn((_key: string, defaultValue?: number) => defaultValue),
    } as unknown as jest.Mocked<ConfigService>;
    dataSource = {
      query: jest.fn().mockResolvedValue([]),
      transaction: jest.fn(),
    } as unknown as jest.Mocked<DataSource>;
    promotionsApplication = {
      previewCatalogPromotionsForProducts: jest.fn().mockResolvedValue({}),
    };
    auditWriter = { log: jest.fn().mockResolvedValue(undefined) };
    tenantContext = {
      requireTenantId: jest.fn().mockReturnValue(TENANT_ID),
      requireTenantIdOrDefault: jest.fn().mockResolvedValue(TENANT_ID),
    };
    service = new ProductsService(
      productsRepository,
      categoriesRepository,
      inventoriesRepository,
      variantsRepository,
      storageService,
      configService,
      dataSource,
      promotionsApplication as unknown as PromotionsApplicationService,
      auditWriter as unknown as AuditWriterService,
      tenantContext as never,
    );
  });

  it('should_reject_list_when_min_price_greater_than_max_price', async () => {
    await expect(
      service.listProducts({
        page: 1,
        limit: 10,
        sort: ProductSort.NEWEST,
        min_price: 500,
        max_price: 100,
      } as Parameters<ProductsService['listProducts']>[0]),
    ).rejects.toThrow(BadRequestException);
  });

  it('should_reject_create_when_category_is_not_level_2', async () => {
    categoriesRepository.findOne.mockResolvedValue({
      id: 'cat-1',
      level: 1,
      deletedAt: null,
    } as CategoryEntity);

    await expect(
      service.createProduct(
        {
          name: 'X',
          description: 'Y',
          price: 1,
          category_id: 'cat-1',
          images: ['https://cdn.example.com/a.jpg'],
        },
        [],
        testActor,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('should_reject_create_when_images_missing', async () => {
    await expect(
      service.createProduct(
        {
          name: 'X',
          description: 'Y',
          price: 1,
          category_id: 'cat-1',
        },
        [],
        testActor,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('should_reject_create_when_category_not_found', async () => {
    categoriesRepository.findOne.mockResolvedValue(null);
    await expect(
      service.createProduct(
        {
          name: 'X',
          description: 'Y',
          price: 1,
          category_id: 'cat-1',
          images: ['https://cdn.example.com/a.jpg'],
        },
        [],
        testActor,
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('should_throw_not_found_when_get_product_missing', async () => {
    productsRepository.findOne.mockResolvedValue(null);

    await expect(service.getProductById('missing')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should_reject_soft_delete_when_product_has_order_items', async () => {
    productsRepository.findOne.mockResolvedValue({
      id: 'p-1',
    } as ProductEntity);
    dataSource.query.mockResolvedValue([{ count: 1 }]);

    await expect(service.softDeleteProduct('p-1', testActor)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should_soft_delete_when_no_order_items', async () => {
    productsRepository.findOne.mockResolvedValue({
      id: 'p-1',
    } as ProductEntity);
    dataSource.query.mockResolvedValue([{ count: 0 }]);
    productsRepository.softDelete.mockResolvedValue({ affected: 1 } as never);

    await service.softDeleteProduct('p-1', testActor);

    expect(productsRepository.softDelete.mock.calls[0]).toEqual(['p-1']);
  });

  it('should_throw_not_found_when_soft_delete_product_missing', async () => {
    productsRepository.findOne.mockResolvedValue(null);
    await expect(
      service.softDeleteProduct('missing', testActor),
    ).rejects.toThrow(NotFoundException);
  });

  it('should_use_list_cache_within_ttl', async () => {
    const listQb = buildListQueryBuilderMock();
    listQb.getManyAndCount.mockResolvedValue([[], 0]);
    productsRepository.createQueryBuilder.mockReturnValue(
      listQb as unknown as ReturnType<
        Repository<ProductEntity>['createQueryBuilder']
      >,
    );

    const query = {
      page: 1,
      limit: 10,
      sort: ProductSort.NEWEST,
    } as Parameters<ProductsService['listProducts']>[0];

    await service.listProducts(query);
    await service.listProducts(query);

    expect(listQb.getManyAndCount).toHaveBeenCalledTimes(1);
  });

  it('should_expand_parent_category_filter_to_include_children', async () => {
    categoriesRepository.findOne.mockResolvedValue({
      id: 'parent-1',
      level: 1,
    } as CategoryEntity);
    categoriesRepository.find.mockResolvedValue([
      { id: 'sub-1' },
      { id: 'sub-2' },
    ] as CategoryEntity[]);

    const listQb = buildListQueryBuilderMock();
    listQb.getManyAndCount.mockResolvedValue([[], 0]);
    productsRepository.createQueryBuilder.mockReturnValue(
      listQb as unknown as ReturnType<
        Repository<ProductEntity>['createQueryBuilder']
      >,
    );

    await service.listProducts({
      page: 1,
      limit: 10,
      sort: ProductSort.NEWEST,
      category_id: 'parent-1',
    } as Parameters<ProductsService['listProducts']>[0]);

    expect(listQb.andWhere).toHaveBeenCalledWith(
      'product.categoryId IN (:...categoryIds)',
      { categoryIds: ['parent-1', 'sub-1', 'sub-2'] },
    );
  });

  it('should_apply_filters_and_resolve_signed_thumbnail_urls', async () => {
    const listQb = buildListQueryBuilderMock();
    listQb.getManyAndCount.mockResolvedValue([
      [
        {
          id: 'p-1',
          name: 'Hoodie',
          slug: 'hoodie',
          price: 100000,
          thumbnail: 'https://my-bucket.s3.amazonaws.com/products/hoodie/1.jpg',
          isActive: true,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          category: { id: 'sub-1', name: 'Sub 1' },
        },
      ],
      1,
    ]);
    productsRepository.createQueryBuilder.mockReturnValue(
      listQb as unknown as ReturnType<
        Repository<ProductEntity>['createQueryBuilder']
      >,
    );
    variantsRepository.find.mockResolvedValue([
      {
        id: 'v-def',
        productId: 'p-1',
        color: 'Mặc định',
        size: '-',
        sortOrder: 0,
      } as ProductVariantEntity,
    ]);
    dataSource.query.mockResolvedValue([
      { productId: 'p-1', variantId: 'v-def', stock: '5' },
    ]);

    const result = await service.listProducts({
      page: 1,
      limit: 10,
      keyword: 'hoodie',
      min_price: 1000,
      max_price: 200000,
      is_active: true,
      sort: ProductSort.PRICE_DESC,
    } as Parameters<ProductsService['listProducts']>[0]);

    expect(listQb.andWhere).toHaveBeenCalledWith(
      '(LOWER(product.name) LIKE LOWER(:kw) OR LOWER(product.slug) LIKE LOWER(:kw))',
      { kw: '%hoodie%' },
    );
    expect(listQb.andWhere).toHaveBeenCalledWith('product.price >= :minPrice', {
      minPrice: 1000,
    });
    expect(listQb.andWhere).toHaveBeenCalledWith('product.price <= :maxPrice', {
      maxPrice: 200000,
    });
    expect(listQb.andWhere).toHaveBeenCalledWith(
      'product.isActive = :isActive',
      { isActive: true },
    );
    expect(listQb.orderBy).toHaveBeenCalledWith('product.price', 'DESC');
    expect(storageService.getSignedDownloadUrl.mock.calls[0]).toEqual([
      'products/hoodie/1.jpg',
      900,
    ]);
    expect(result.items[0]?.thumbnail).toBe('https://signed.example.com/img');
  });

  it('should_run_create_transaction_when_valid_subcategory', async () => {
    categoriesRepository.findOne.mockResolvedValue({
      id: 'sub-1',
      level: 2,
      deletedAt: null,
    } as CategoryEntity);

    const slugQb = buildSlugQueryBuilderMock();
    slugQb.getOne.mockResolvedValue(null);
    productsRepository.createQueryBuilder.mockReturnValue(
      slugQb as unknown as ReturnType<
        Repository<ProductEntity>['createQueryBuilder']
      >,
    );

    const listQb = buildListQueryBuilderMock();
    listQb.getManyAndCount.mockResolvedValue([[], 0]);

    dataSource.transaction.mockImplementation(((
      fn: (m: unknown) => unknown,
    ) => {
      const manager = {
        create: jest.fn((Entity: unknown, data: object) => ({
          ...data,
          id: 'new-id',
        })),
        save: jest.fn((arg: unknown) => {
          if (Array.isArray(arg)) {
            return arg as unknown[];
          }
          return { ...(arg as object), id: 'new-id' };
        }),
      };
      return fn(manager);
    }) as never);

    await service.createProduct(
      {
        name: 'Hoodie',
        description: 'Nice',
        price: 100000,
        category_id: 'sub-1',
        images: [
          'https://cdn.example.com/1.jpg',
          'https://cdn.example.com/2.jpg',
        ],
      },
      [],
      testActor,
    );

    expect(dataSource.transaction.mock.calls.length).toBeGreaterThan(0);
  });

  it('should_upload_files_to_s3_and_store_urls_when_images_uploaded', async () => {
    categoriesRepository.findOne.mockResolvedValue({
      id: 'sub-1',
      level: 2,
      deletedAt: null,
    } as CategoryEntity);
    const slugQb = buildSlugQueryBuilderMock();
    slugQb.getOne.mockResolvedValue(null);
    productsRepository.createQueryBuilder.mockReturnValue(
      slugQb as unknown as ReturnType<
        Repository<ProductEntity>['createQueryBuilder']
      >,
    );
    dataSource.transaction.mockImplementation(((
      fn: (m: unknown) => unknown,
    ) => {
      const manager = {
        create: jest.fn((Entity: unknown, data: object) => ({
          ...data,
          id: 'new-id',
        })),
        save: jest.fn((arg: unknown) =>
          Array.isArray(arg) ? arg : { ...(arg as object), id: 'new-id' },
        ),
      };
      return fn(manager);
    }) as never);

    await service.createProduct(
      {
        name: 'Hoodie',
        description: 'Nice',
        price: 100000,
        category_id: 'sub-1',
      },
      [
        {
          originalname: 'a.png',
          mimetype: 'image/png',
          buffer: Buffer.from('file'),
        },
      ],
      testActor,
    );

    expect(storageService.putObject.mock.calls).toHaveLength(1);
    expect(storageService.putObject.mock.calls[0]?.[0]).toContain(
      'products/hoodie/',
    );
    expect(dataSource.transaction.mock.calls.length).toBeGreaterThan(0);
  });

  it('should_replace_images_when_patch_has_new_images', async () => {
    productsRepository.findOne.mockResolvedValue({
      id: 'p-1',
      name: 'Old name',
      slug: 'old-name',
      price: 100000,
      description: 'old',
      isActive: true,
      images: [],
      thumbnail: 'products/old/1.jpg',
    } as unknown as ProductEntity);
    productsRepository.save.mockResolvedValue({} as ProductEntity);

    dataSource.transaction.mockImplementation(((
      fn: (m: unknown) => unknown,
    ) => {
      const manager = {
        save: jest.fn(() => ({})),
        delete: jest.fn(() => ({})),
        create: jest.fn((Entity: unknown, data: object) => data),
      };
      return fn(manager);
    }) as never);

    await service.updateProduct(
      'p-1',
      { images: ['https://a.test/1.jpg'] },
      [],
      testActor,
    );

    expect(dataSource.transaction.mock.calls.length).toBeGreaterThan(0);
  });
});
