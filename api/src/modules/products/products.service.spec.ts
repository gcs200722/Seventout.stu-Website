import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource, Repository } from 'typeorm';
import { CategoryEntity } from '../categories/category.entity';
import { StoragePort } from '../storage/storage.port';
import { ProductEntity } from './product.entity';
import { ProductsService } from './products.service';
import { ProductSort } from './dto/list-products.query.dto';

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

describe('ProductsService', () => {
  let service: ProductsService;
  let productsRepository: jest.Mocked<Repository<ProductEntity>>;
  let categoriesRepository: jest.Mocked<Repository<CategoryEntity>>;
  let storageService: jest.Mocked<StoragePort>;
  let configService: jest.Mocked<ConfigService>;
  let dataSource: jest.Mocked<DataSource>;

  beforeEach(() => {
    productsRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
      softDelete: jest.fn(),
      createQueryBuilder: jest.fn(),
    } as unknown as jest.Mocked<Repository<ProductEntity>>;
    categoriesRepository = {
      findOne: jest.fn(),
    } as unknown as jest.Mocked<Repository<CategoryEntity>>;
    storageService = {
      putObject: jest.fn(),
      getSignedDownloadUrl: jest
        .fn()
        .mockResolvedValue('https://signed.example.com/img'),
    } as unknown as jest.Mocked<StoragePort>;
    configService = {
      get: jest.fn((_key: string, defaultValue?: number) => defaultValue),
    } as unknown as jest.Mocked<ConfigService>;
    dataSource = {
      query: jest.fn(),
      transaction: jest.fn(),
    } as unknown as jest.Mocked<DataSource>;
    service = new ProductsService(
      productsRepository,
      categoriesRepository,
      storageService,
      configService,
      dataSource,
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
      service.createProduct({
        name: 'X',
        description: 'Y',
        price: 1,
        category_id: 'cat-1',
        images: ['https://cdn.example.com/a.jpg'],
      }),
    ).rejects.toThrow(BadRequestException);
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

    await expect(service.softDeleteProduct('p-1')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should_soft_delete_when_no_order_items', async () => {
    productsRepository.findOne.mockResolvedValue({
      id: 'p-1',
    } as ProductEntity);
    dataSource.query.mockResolvedValue([{ count: 0 }]);
    productsRepository.softDelete.mockResolvedValue({ affected: 1 } as never);

    await service.softDeleteProduct('p-1');

    expect(productsRepository.softDelete.mock.calls[0]).toEqual(['p-1']);
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

    await service.createProduct({
      name: 'Hoodie',
      description: 'Nice',
      price: 100000,
      category_id: 'sub-1',
      images: [
        'https://cdn.example.com/1.jpg',
        'https://cdn.example.com/2.jpg',
      ],
    });

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
    );

    expect(dataSource.transaction.mock.calls.length).toBeGreaterThan(0);
  });
});
