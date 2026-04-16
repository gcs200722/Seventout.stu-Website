import { BadRequestException } from '@nestjs/common';
import { DataSource, Repository, type EntityManager } from 'typeorm';
import { ProductEntity } from '../products/product.entity';
import { QueuePort } from '../queue/queue.port';
import { InventoryService } from './inventory.service';
import { InventoryEntity } from './entities/inventory.entity';
import { InventoryMovementEntity } from './entities/inventory-movement.entity';
import { ProductChannelMappingEntity } from './entities/product-channel-mapping.entity';
import { InventoryChannel, InventoryMovementType } from './inventory.types';

describe('InventoryService', () => {
  let service: InventoryService;
  let productsRepository: jest.Mocked<Repository<ProductEntity>>;
  let inventoriesRepository: jest.Mocked<Repository<InventoryEntity>>;
  let movementsRepository: jest.Mocked<Repository<InventoryMovementEntity>>;
  let mappingsRepository: jest.Mocked<Repository<ProductChannelMappingEntity>>;
  let queuePort: jest.Mocked<QueuePort>;
  let dataSource: jest.Mocked<DataSource>;

  beforeEach(() => {
    productsRepository = {
      findOne: jest.fn(),
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

    service = new InventoryService(
      productsRepository,
      inventoriesRepository,
      movementsRepository,
      mappingsRepository,
      queuePort,
      dataSource,
    );
  });

  it('rejects sync when mapping missing', async () => {
    mappingsRepository.findOne.mockResolvedValue(null);

    await expect(
      service.requestSync({
        product_id: 'cbf6ccf8-b249-4a7c-ad5e-a4bc2f5909a4',
        channel: InventoryChannel.SHOPEE,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('enqueues sync with retry options', async () => {
    mappingsRepository.findOne.mockResolvedValue({
      id: 'm-1',
      productId: 'p-1',
      channel: InventoryChannel.SHOPEE,
      externalProductId: 'ex-p',
      externalSkuId: 'ex-s',
      isActive: true,
    } as ProductChannelMappingEntity);

    await service.requestSync({
      product_id: 'p-1',
      channel: InventoryChannel.SHOPEE,
    });

    expect(queuePort.enqueue.mock.calls[0]).toEqual([
      'inventory.sync.stock',
      { product_id: 'p-1', channel: InventoryChannel.SHOPEE },
      { attempts: 5, backoffMs: 2000 },
    ]);
  });

  it('fails reserve when stock is insufficient', async () => {
    productsRepository.findOne.mockResolvedValue({
      id: 'p-1',
      deletedAt: null,
    } as ProductEntity);

    (dataSource.transaction as jest.Mock).mockImplementation(
      async (cb: (manager: EntityManager) => Promise<unknown>) => {
        const qb = {
          setLock: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue({
            id: 'inv-1',
            productId: 'p-1',
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
      service.reserveFromOrder('p-1', 2, 'Order created: reserve stock'),
    ).rejects.toThrow(BadRequestException);
  });

  it('records adjustment movement via transaction', async () => {
    productsRepository.findOne.mockResolvedValue({
      id: 'p-1',
      deletedAt: null,
    } as ProductEntity);

    (dataSource.transaction as jest.Mock).mockImplementation(
      async (cb: (manager: EntityManager) => Promise<unknown>) => {
        const stock = {
          id: 'inv-1',
          productId: 'p-1',
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

    await service.adjustInventory('p-1', {
      channel: InventoryChannel.INTERNAL,
      type: InventoryMovementType.IN,
      quantity: 5,
      reason: 'Import',
    });

    expect(dataSource.transaction.mock.calls.length).toBeGreaterThan(0);
  });
});
