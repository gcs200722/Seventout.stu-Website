import { NotFoundException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import type { StoragePort } from '../storage/storage.port';
import { PromotionsApplicationService } from '../promotions/promotions.application.service';
import { WishlistEventOutboxEntity } from './entities/wishlist-event-outbox.entity';
import { WishlistItemEntity } from './entities/wishlist-item.entity';
import { WishlistEventDispatcherService } from './events/wishlist-event-dispatcher.service';
import { WishlistApplicationService } from './wishlist.application.service';

describe('WishlistApplicationService', () => {
  let service: WishlistApplicationService;
  let dataSource: jest.Mocked<DataSource>;
  let wishlistRepository: jest.Mocked<Repository<WishlistItemEntity>>;
  let outboxRepository: jest.Mocked<Repository<WishlistEventOutboxEntity>>;
  let dispatcher: jest.Mocked<WishlistEventDispatcherService>;
  let storage: jest.Mocked<StoragePort>;
  let configService: { get: jest.Mock };
  let promotionsApplication: jest.Mocked<
    Pick<PromotionsApplicationService, 'previewCatalogPromotionsForProducts'>
  >;

  beforeEach(() => {
    wishlistRepository = {
      createQueryBuilder: jest.fn(),
      findOne: jest.fn(),
    } as never;

    outboxRepository = {
      find: jest.fn(),
      save: jest.fn(),
    } as never;

    dispatcher = {
      dispatch: jest.fn(),
    } as never;

    dataSource = {
      transaction: jest.fn(),
    } as never;

    storage = {
      getSignedDownloadUrl: jest
        .fn()
        .mockResolvedValue('https://signed.example/x.jpg'),
      getSignedPutUrl: jest
        .fn()
        .mockResolvedValue('https://signed-put.example/x.jpg'),
    } as never;

    configService = {
      get: jest.fn((key: string, def?: number) =>
        key === 'AWS_S3_PRESIGNED_EXPIRES_SECONDS' ? (def ?? 900) : undefined,
      ),
    };

    promotionsApplication = {
      previewCatalogPromotionsForProducts: jest.fn().mockResolvedValue({}),
    };

    service = new WishlistApplicationService(
      dataSource,
      wishlistRepository,
      outboxRepository,
      dispatcher,
      storage,
      configService as never,
      promotionsApplication as unknown as PromotionsApplicationService,
    );
  });

  it('addItem is idempotent when row already exists', async () => {
    const productRepo = {
      findOne: jest.fn().mockResolvedValue({
        id: 'p1',
        deletedAt: null,
        isActive: true,
      }),
    };
    const wishRepo = {
      findOne: jest.fn().mockResolvedValue({ id: 'w1' }),
      create: jest.fn(),
      save: jest.fn(),
    };
    const outboxRepo = { save: jest.fn() };

    let repoIndex = 0;
    const repos = [productRepo, wishRepo, outboxRepo];
    (dataSource.transaction as jest.Mock).mockImplementation(
      async (fn: (m: unknown) => Promise<unknown>) => {
        const manager = {
          getRepository: jest.fn(() => {
            const next = repos[repoIndex];
            repoIndex += 1;
            return next;
          }),
        };
        return fn(manager);
      },
    );

    const result = await service.addItem('u1', { product_id: 'p1' });
    expect(result).toEqual({ created: false });
    expect(wishRepo.save).not.toHaveBeenCalled();
  });

  it('addItem throws PRODUCT_NOT_FOUND when product missing', async () => {
    const productRepo = {
      findOne: jest.fn().mockResolvedValue(null),
    };
    (dataSource.transaction as jest.Mock).mockImplementation(
      async (fn: (m: unknown) => Promise<unknown>) => {
        const manager = {
          getRepository: jest.fn(() => productRepo),
        };
        return fn(manager);
      },
    );

    await expect(
      service.addItem('u1', { product_id: 'missing' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('removeItem completes without error when nothing deleted', async () => {
    const wishRepo = {
      delete: jest.fn().mockResolvedValue({ affected: 0 }),
      save: jest.fn(),
    };
    (dataSource.transaction as jest.Mock).mockImplementation(
      async (fn: (m: unknown) => Promise<unknown>) => {
        const manager = {
          getRepository: jest.fn(() => wishRepo),
        };
        return fn(manager);
      },
    );

    await expect(service.removeItem('u1', 'p1')).resolves.toBeUndefined();
  });
});
