import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource, Repository } from 'typeorm';
import { QueuePort } from '../../core/queue/queue.port';
import { InventoryWebhookEventEntity } from './entities/inventory-webhook-event.entity';
import { InventoryWebhookService } from './inventory-webhook.service';
import { InventoryChannel } from './inventory.types';

describe('InventoryWebhookService', () => {
  let service: InventoryWebhookService;
  let webhookRepo: jest.Mocked<Repository<InventoryWebhookEventEntity>>;
  let queuePort: jest.Mocked<QueuePort>;
  let configService: jest.Mocked<ConfigService>;
  let dataSource: jest.Mocked<DataSource>;

  beforeEach(() => {
    webhookRepo = {
      findOne: jest.fn(),
      create: jest.fn((payload) => payload as never),
      save: jest.fn(),
      update: jest.fn(),
    } as never;
    queuePort = {
      enqueue: jest.fn(),
    } as never;
    configService = {
      get: jest.fn(),
    } as never;
    configService.get.mockImplementation((key: string) => {
      if (key === 'DEFAULT_TENANT_ID') {
        return 'tenant-1';
      }
      return undefined;
    });
    dataSource = {
      query: jest.fn(),
    } as never;

    service = new InventoryWebhookService(
      webhookRepo,
      queuePort,
      configService,
      dataSource,
    );
  });

  it('ignores duplicate webhook event', async () => {
    webhookRepo.findOne.mockResolvedValue({
      id: 'id-1',
      channel: InventoryChannel.SHOPEE,
      externalEventId: 'evt-1',
    } as InventoryWebhookEventEntity);

    await service.receiveWebhook(
      InventoryChannel.SHOPEE,
      { event_id: 'evt-1', payload: { product_id: 'p-1' } },
      undefined,
    );

    expect(queuePort.enqueue.mock.calls).toHaveLength(0);
  });

  it('queues webhook event with retry', async () => {
    webhookRepo.findOne.mockResolvedValue(null);
    webhookRepo.save.mockResolvedValue({} as never);

    await service.receiveWebhook(
      InventoryChannel.TIKTOK,
      { event_id: 'evt-2', payload: { product_id: 'p-1' } },
      undefined,
    );

    expect(queuePort.enqueue.mock.calls[0]).toEqual([
      'inventory.webhook.event',
      {
        tenant_id: 'tenant-1',
        channel: InventoryChannel.TIKTOK,
        event_id: 'evt-2',
      },
      { attempts: 5, backoffMs: 2000 },
    ]);
  });

  it('throws when webhook event payload lookup fails', async () => {
    webhookRepo.findOne.mockResolvedValue(null);
    await expect(
      service.getWebhookPayload('tenant-1', InventoryChannel.SHOPEE, 'missing'),
    ).rejects.toThrow(BadRequestException);
  });
});
