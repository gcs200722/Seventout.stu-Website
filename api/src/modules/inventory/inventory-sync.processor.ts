import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { DEFAULT_QUEUE_NAME } from '../queue/queue.constants';
import { Repository } from 'typeorm';
import { ProductChannelMappingEntity } from './entities/product-channel-mapping.entity';
import { InventoryEntity } from './entities/inventory.entity';
import { InventoryMovementType, InventoryChannel } from './inventory.types';
import { INVENTORY_CHANNEL_CLIENTS } from './inventory.constants';
import { ChannelInventoryClient } from './channels/channel-inventory.client';
import { InventoryWebhookService } from './inventory-webhook.service';

@Injectable()
@Processor(DEFAULT_QUEUE_NAME)
export class InventorySyncProcessor extends WorkerHost {
  private readonly logger = new Logger(InventorySyncProcessor.name);
  private readonly clientsMap: Map<InventoryChannel, ChannelInventoryClient>;

  constructor(
    @InjectRepository(ProductChannelMappingEntity)
    private readonly mappingsRepository: Repository<ProductChannelMappingEntity>,
    @InjectRepository(InventoryEntity)
    private readonly inventoriesRepository: Repository<InventoryEntity>,
    @Inject(INVENTORY_CHANNEL_CLIENTS)
    clients: ChannelInventoryClient[],
    private readonly inventoryWebhookService: InventoryWebhookService,
  ) {
    super();
    this.clientsMap = new Map(clients.map((item) => [item.channel, item]));
  }

  async process(job: Job<Record<string, unknown>>): Promise<void> {
    const jobName = this.readInventoryJobName(job.name);
    switch (jobName) {
      case 'inventory.sync.stock':
        await this.processSyncStock(job);
        return;
      case 'inventory.webhook.event':
        await this.processWebhookEvent(job);
        return;
      default:
        return;
    }
  }

  private async processSyncStock(
    job: Job<Record<string, unknown>>,
  ): Promise<void> {
    const productId = this.readStringField(job.data, 'product_id');
    const channel = this.readInventoryChannel(job.data, 'channel');
    const mapping = await this.mappingsRepository.findOne({
      where: { productId, channel, isActive: true },
    });
    if (!mapping) {
      throw new Error('Mapping missing for sync');
    }

    const inventory = await this.inventoriesRepository.findOne({
      where: { productId, channel: InventoryChannel.INTERNAL },
    });
    const client = this.clientsMap.get(channel);
    if (!client) {
      throw new Error(`Channel client unavailable for ${channel}`);
    }

    await client.pushStock({
      externalProductId: mapping.externalProductId,
      externalSkuId: mapping.externalSkuId,
      availableStock: inventory?.availableStock ?? 0,
    });
  }

  private async processWebhookEvent(
    job: Job<Record<string, unknown>>,
  ): Promise<void> {
    const channel = this.readInventoryChannel(job.data, 'channel');
    const eventId = this.readStringField(job.data, 'event_id');
    const payload = await this.inventoryWebhookService.getWebhookPayload(
      channel,
      eventId,
    );
    this.logger.log(`Processed webhook channel=${channel} event=${eventId}`);

    const productId = this.readStringField(payload, 'product_id');
    const quantity = Number(payload.quantity ?? 0);
    if (productId && quantity > 0) {
      const action = this.readOptionalUppercaseStringField(payload, 'action');
      if (action === InventoryMovementType.RELEASE) {
        // Inventory movement from external cancel event.
        this.logger.log(
          `Release event from webhook product=${productId} qty=${quantity}`,
        );
      }
    }

    await this.inventoryWebhookService.markWebhookProcessed(channel, eventId);
  }

  private readStringField(
    payload: Record<string, unknown>,
    key: string,
  ): string {
    const value = payload[key];
    return typeof value === 'string' ? value : '';
  }

  private readOptionalUppercaseStringField(
    payload: Record<string, unknown>,
    key: string,
  ): string | null {
    const value = payload[key];
    return typeof value === 'string' ? value.toUpperCase() : null;
  }

  private readInventoryChannel(
    payload: Record<string, unknown>,
    key: string,
  ): InventoryChannel {
    const value = payload[key];
    if (
      value === InventoryChannel.INTERNAL ||
      value === InventoryChannel.SHOPEE ||
      value === InventoryChannel.TIKTOK
    ) {
      return value;
    }
    throw new Error(`Invalid inventory channel in job payload: ${String(key)}`);
  }

  private readInventoryJobName(
    name: string,
  ): 'inventory.sync.stock' | 'inventory.webhook.event' | null {
    if (name === 'inventory.sync.stock') {
      return 'inventory.sync.stock';
    }
    if (name === 'inventory.webhook.event') {
      return 'inventory.webhook.event';
    }
    return null;
  }
}
