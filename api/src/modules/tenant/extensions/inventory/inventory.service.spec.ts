import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DataSource, Repository, type EntityManager } from 'typeorm';
import type { AuthenticatedUser } from '../../core/auth/auth.types';
import { UserRole } from '../../core/authorization/authorization.types';
import { AuditWriterService } from '../../core/audit/audit-writer.service';
import { ProductEntity } from '../products/product.entity';
import { ProductVariantEntity } from '../products/product-variant.entity';
import { QueuePort } from '../../core/queue/queue.port';
import { InventoryService } from './inventory.service';
import { InventoryEntity } from './entities/inventory.entity';
import { InventoryMovementEntity } from './entities/inventory-movement.entity';
import { ProductChannelMappingEntity } from './entities/product-channel-mapping.entity';
import { InventoryChannel, InventoryMovementType } from './inventory.types';

const staffActor: AuthenticatedUser = {
  id: 'staff-1',
  email: 'staff@test.com',
  role: UserRole.STAFF,
  permissions: [],
};

const VARIANT_ID = 'v-1';

function mockVariant(): ProductVariantEntity {
  return {
    id: VARIANT_ID,
    productId: 'p-1',
    product: { deletedAt: null, id: 'p-1' } as ProductEntity,
  } as ProductVariantEntity;
}

describe('InventoryService', () => {
  let service: InventoryService;
  let productsRepository: jest.Mocked<Repository<ProductEntity>>;
  let variantsRepository: jest.Mocked<Repository<ProductVariantEntity>>;
  let inventoriesRepository: jest.Mocked<Repository<InventoryEntity>>;
  let movementsRepository: jest.Mocked<Repository<InventoryMovementEntity>>;
  let mappingsRepository: jest.Mocked<Repository<ProductChannelMappingEntity>>;
  let queuePort: jest.Mocked<QueuePort>;
  let dataSource: jest.Mocked<DataSource>;
  let auditWriter: { log: jest.Mock };

  beforeEach(() => {
    productsRepository = {
      findOne: jest.fn(),
    } as never;
    variantsRepository = {
      findOne: jest.fn().mockResolvedValue(mockVariant()),
      find: jest.fn().mockResolvedValue([mockVariant()]),
    } as never;
    inventoriesRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      createQueryBuilder: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    } as never;
    movementsRepository = {
      createQueryBuilder: jest.fn(),
    } as never;
    mappingsRepository = {
      findOne: jest.fn(),
    } as never;
    queuePort = {
      enqueue: jest.fn(),
    } as never;
    dataSource = {
      transaction: jest.fn(),
    } as never;
    auditWriter = { log: jest.fn().mockResolvedValue(undefined) };

    const configService = {
      get: jest.fn((key: string, defaultValue?: unknown) => {
        if (key === 'DEFAULT_TENANT_ID') return 'tenant-1';
        return defaultValue;
      }),
    };

    service = new InventoryService(
      productsRepository,
      variantsRepository,
      inventoriesRepository,
      movementsRepository,
      mappingsRepository,
      queuePort,
      configService as never,
      dataSource,
      auditWriter as unknown as AuditWriterService,
    );
  });

  it('rejects sync when mapping missing', async () => {
    mappingsRepository.findOne.mockResolvedValue(null);

    await expect(
      service.requestSync(
        {
          product_variant_id: 'cbf6ccf8-b249-4a7c-ad5e-a4bc2f5909a4',
          channel: InventoryChannel.SHOPEE,
        },
        staffActor,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('enqueues sync with retry options', async () => {
    mappingsRepository.findOne.mockResolvedValue({
      id: 'm-1',
      productVariantId: VARIANT_ID,
      channel: InventoryChannel.SHOPEE,
      externalProductId: 'ex-p',
      externalSkuId: 'ex-s',
      isActive: true,
    } as ProductChannelMappingEntity);

    await service.requestSync(
      {
        product_variant_id: VARIANT_ID,
        channel: InventoryChannel.SHOPEE,
      },
      staffActor,
    );

    expect(queuePort.enqueue.mock.calls[0]).toEqual([
      'inventory.sync.stock',
      {
        product_variant_id: VARIANT_ID,
        channel: InventoryChannel.SHOPEE,
        tenant_id: 'tenant-1',
      },
      { attempts: 5, backoffMs: 2000 },
    ]);
  });

  it('lists inventory from cache on second call', async () => {
    const qb = {
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([{ product_id: 'p-1' }]),
      getCount: jest.fn().mockResolvedValue(1),
    };
    inventoriesRepository.createQueryBuilder.mockReturnValue(qb as never);

    const query = { page: 1, limit: 10 } as never;
    const first = await service.listInventory(query);
    const second = await service.listInventory(query);

    expect(first.total).toBe(1);
    expect(second.items).toHaveLength(1);
    expect(qb.getRawMany).toHaveBeenCalledTimes(1);
  });

  it('returns product inventory channels', async () => {
    productsRepository.findOne.mockResolvedValue({
      id: 'p-1',
      deletedAt: null,
    } as ProductEntity);
    variantsRepository.find.mockResolvedValue([
      {
        id: VARIANT_ID,
        productId: 'p-1',
        color: 'Đen',
        size: 'M',
        sortOrder: 0,
      } as ProductVariantEntity,
    ]);
    inventoriesRepository.find.mockResolvedValue([
      {
        productVariantId: VARIANT_ID,
        channel: InventoryChannel.INTERNAL,
        availableStock: 5,
        reservedStock: 1,
      } as InventoryEntity,
    ]);

    const result = await service.getInventoryByProductId('p-1');
    expect(result).toEqual({
      product_id: 'p-1',
      variants: [
        {
          product_variant_id: VARIANT_ID,
          color: 'Đen',
          size: 'M',
          channels: [
            {
              channel: InventoryChannel.INTERNAL,
              available_stock: 5,
              reserved_stock: 1,
            },
          ],
        },
      ],
    });
  });

  it('throws NotFound when product inventory requested for deleted product', async () => {
    productsRepository.findOne.mockResolvedValue({
      id: 'p-1',
      deletedAt: new Date(),
    } as ProductEntity);
    await expect(service.getInventoryByProductId('p-1')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('fails reserve when stock is insufficient', async () => {
    (dataSource.transaction as jest.Mock).mockImplementation(
      async (cb: (manager: EntityManager) => Promise<unknown>) => {
        const qb = {
          setLock: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue({
            id: 'inv-1',
            productVariantId: VARIANT_ID,
            channel: InventoryChannel.INTERNAL,
            availableStock: 1,
            reservedStock: 0,
          }),
        };
        const manager = {
          getRepository: jest.fn().mockReturnValue({
            createQueryBuilder: jest.fn().mockReturnValue(qb),
            create: jest.fn(),
            save: jest.fn(),
          }),
          save: jest.fn(),
          create: jest.fn(),
        };
        return cb(manager as unknown as EntityManager);
      },
    );

    await expect(
      service.reserveFromOrder(VARIANT_ID, 2, 'Order created: reserve stock'),
    ).rejects.toThrow(BadRequestException);
  });

  it('records adjustment movement via transaction', async () => {
    (dataSource.transaction as jest.Mock).mockImplementation(
      async (cb: (manager: EntityManager) => Promise<unknown>) => {
        const stock = {
          id: 'inv-1',
          productVariantId: VARIANT_ID,
          channel: InventoryChannel.INTERNAL,
          availableStock: 5,
          reservedStock: 0,
        };
        const qb = {
          setLock: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue(stock),
        };
        const repo = {
          createQueryBuilder: jest.fn().mockReturnValue(qb),
          create: jest.fn((x: unknown) => x),
          save: jest.fn((v: unknown) => Promise.resolve(v)),
        };
        const manager = {
          getRepository: jest.fn().mockReturnValue(repo),
          create: jest.fn((_: unknown, payload: unknown) => payload),
          save: jest.fn((v: unknown) => Promise.resolve(v)),
        };
        return cb(manager as unknown as EntityManager);
      },
    );

    await service.adjustInventory(
      VARIANT_ID,
      {
        channel: InventoryChannel.INTERNAL,
        type: InventoryMovementType.IN,
        quantity: 5,
        reason: 'Import',
      },
      staffActor,
    );

    expect(dataSource.transaction.mock.calls.length).toBeGreaterThan(0);
  });

  it('throws when adjust OUT makes stock negative', async () => {
    (dataSource.transaction as jest.Mock).mockImplementation(
      async (cb: (manager: EntityManager) => Promise<unknown>) => {
        const stock = {
          id: 'inv-1',
          productVariantId: VARIANT_ID,
          channel: InventoryChannel.INTERNAL,
          availableStock: 1,
          reservedStock: 0,
        };
        const qb = {
          setLock: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue(stock),
        };
        const repo = {
          createQueryBuilder: jest.fn().mockReturnValue(qb),
          create: jest.fn((x: unknown) => x),
          save: jest.fn((v: unknown) => Promise.resolve(v)),
        };
        const manager = {
          getRepository: jest.fn().mockReturnValue(repo),
          create: jest.fn((_: unknown, payload: unknown) => payload),
          save: jest.fn((v: unknown) => Promise.resolve(v)),
        };
        return cb(manager as unknown as EntityManager);
      },
    );

    await expect(
      service.adjustInventory(
        VARIANT_ID,
        {
          channel: InventoryChannel.INTERNAL,
          type: InventoryMovementType.OUT,
          quantity: 5,
          reason: 'Sell',
        },
        staffActor,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('lists inventory movements with query builder', async () => {
    const qb = {
      where: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest
        .fn()
        .mockResolvedValue([[{ id: 'm-1' as never }], 1]),
    };
    movementsRepository.createQueryBuilder.mockReturnValue(qb as never);

    const result = await service.listMovements({
      page: 1,
      limit: 10,
      product_id: 'p-1',
      channel: InventoryChannel.INTERNAL,
      type: InventoryMovementType.IN,
      from_date: '2024-01-01',
      to_date: '2024-01-31',
    } as never);
    expect(result.total).toBe(1);
    expect(qb.andWhere).toHaveBeenCalled();
  });

  it('commitOutFromOrder delegates to transaction flow', async () => {
    (dataSource.transaction as jest.Mock).mockImplementation(
      async (cb: (manager: EntityManager) => Promise<unknown>) => {
        const stock = {
          id: 'inv-1',
          productVariantId: VARIANT_ID,
          channel: InventoryChannel.INTERNAL,
          availableStock: 5,
          reservedStock: 5,
        };
        const qb = {
          setLock: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue(stock),
        };
        const repo = {
          createQueryBuilder: jest.fn().mockReturnValue(qb),
          create: jest.fn((x: unknown) => x),
          save: jest.fn((v: unknown) => Promise.resolve(v)),
        };
        const manager = {
          getRepository: jest.fn().mockReturnValue(repo),
          create: jest.fn((_: unknown, payload: unknown) => payload),
          save: jest.fn((v: unknown) => Promise.resolve(v)),
        };
        return cb(manager as unknown as EntityManager);
      },
    );

    await service.commitOutFromOrder(
      VARIANT_ID,
      2,
      'Order completed: commit stock out',
    );
    expect(
      (dataSource.transaction as jest.Mock).mock.calls.length,
    ).toBeGreaterThan(0);
  });
});
