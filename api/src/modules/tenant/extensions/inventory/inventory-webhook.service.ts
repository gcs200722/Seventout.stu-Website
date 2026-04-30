import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { createHmac, timingSafeEqual } from 'crypto';
import { DataSource, Repository } from 'typeorm';
import { QUEUE_PORT } from '../../core/queue/queue.constants';
import type { QueuePort } from '../../core/queue/queue.port';
import { ChannelWebhookDto } from './dto/channel-webhook.dto';
import { InventoryWebhookEventEntity } from './entities/inventory-webhook-event.entity';
import { InventoryJobName, InventoryChannel } from './inventory.types';

@Injectable()
export class InventoryWebhookService {
  private defaultTenantId: string | null = null;
  constructor(
    @InjectRepository(InventoryWebhookEventEntity)
    private readonly webhookEventsRepository: Repository<InventoryWebhookEventEntity>,
    @Inject(QUEUE_PORT)
    private readonly queuePort: QueuePort,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
  ) {}

  async receiveWebhook(
    channel: InventoryChannel,
    payload: ChannelWebhookDto,
    signature?: string,
  ): Promise<void> {
    const tenantId = await this.resolveTenantId();
    this.validateChannelSignature(channel, payload, signature);

    const existed = await this.webhookEventsRepository.findOne({
      where: { tenantId, channel, externalEventId: payload.event_id },
    });
    if (existed) {
      return;
    }

    const created = this.webhookEventsRepository.create({
      tenantId,
      channel,
      externalEventId: payload.event_id,
      payload: payload.payload,
      processedAt: null,
    });
    await this.webhookEventsRepository.save(created);

    await this.queuePort.enqueue(
      InventoryJobName.WEBHOOK_EVENT,
      {
        tenant_id: tenantId,
        channel,
        event_id: payload.event_id,
      },
      {
        attempts: 5,
        backoffMs: 2000,
      },
    );
  }

  async markWebhookProcessed(
    tenantId: string,
    channel: InventoryChannel,
    eventId: string,
  ): Promise<void> {
    await this.webhookEventsRepository.update(
      { tenantId, channel, externalEventId: eventId },
      { processedAt: new Date() },
    );
  }

  async getWebhookPayload(
    tenantId: string,
    channel: InventoryChannel,
    eventId: string,
  ): Promise<Record<string, unknown>> {
    const event = await this.webhookEventsRepository.findOne({
      where: { tenantId, channel, externalEventId: eventId },
    });
    if (!event) {
      throw new BadRequestException({
        message: 'Webhook event not found',
        details: { code: 'WEBHOOK_EVENT_NOT_FOUND' },
      });
    }
    return event.payload;
  }

  private async resolveTenantId(): Promise<string> {
    if (this.defaultTenantId) {
      return this.defaultTenantId;
    }
    const configured = this.configService.get<string>('DEFAULT_TENANT_ID');
    if (configured?.trim()) {
      this.defaultTenantId = configured.trim();
      return this.defaultTenantId;
    }
    const fallbackSlug = this.configService.get<string>(
      'DEFAULT_TENANT_SLUG',
      'default',
    );
    const rows: unknown = await this.dataSource.query(
      `SELECT id
       FROM tenants
       WHERE LOWER(slug) = LOWER($1)
       LIMIT 1`,
      [fallbackSlug],
    );
    let id: string | null = null;
    if (Array.isArray(rows) && rows.length > 0) {
      const firstRow: unknown = rows[0];
      if (
        firstRow &&
        typeof firstRow === 'object' &&
        'id' in firstRow &&
        typeof firstRow.id === 'string'
      ) {
        id = firstRow.id;
      }
    }
    if (!id) {
      throw new BadRequestException('Default tenant is not configured.');
    }
    this.defaultTenantId = id;
    return id;
  }

  private validateChannelSignature(
    channel: InventoryChannel,
    payload: ChannelWebhookDto,
    signature?: string,
  ): void {
    const envKey =
      channel === InventoryChannel.SHOPEE
        ? 'SHOPEE_WEBHOOK_SECRET'
        : channel === InventoryChannel.TIKTOK
          ? 'TIKTOK_WEBHOOK_SECRET'
          : undefined;
    if (!envKey) {
      return;
    }

    const secret = this.configService.get<string>(envKey);
    if (!secret) {
      return;
    }

    if (!signature) {
      throw new BadRequestException({
        message: 'Missing webhook signature',
        details: { code: 'INVALID_WEBHOOK_SIGNATURE' },
      });
    }

    const content = JSON.stringify(payload.payload);
    const expected = createHmac('sha256', secret).update(content).digest('hex');
    const safeA = Buffer.from(expected);
    const safeB = Buffer.from(signature);
    if (safeA.length !== safeB.length || !timingSafeEqual(safeA, safeB)) {
      throw new BadRequestException({
        message: 'Invalid webhook signature',
        details: { code: 'INVALID_WEBHOOK_SIGNATURE' },
      });
    }
  }
}
