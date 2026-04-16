import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { createHmac, timingSafeEqual } from 'crypto';
import { Repository } from 'typeorm';
import { QUEUE_PORT } from '../queue/queue.constants';
import type { QueuePort } from '../queue/queue.port';
import { ChannelWebhookDto } from './dto/channel-webhook.dto';
import { InventoryWebhookEventEntity } from './entities/inventory-webhook-event.entity';
import { InventoryJobName, InventoryChannel } from './inventory.types';

@Injectable()
export class InventoryWebhookService {
  constructor(
    @InjectRepository(InventoryWebhookEventEntity)
    private readonly webhookEventsRepository: Repository<InventoryWebhookEventEntity>,
    @Inject(QUEUE_PORT)
    private readonly queuePort: QueuePort,
    private readonly configService: ConfigService,
  ) {}

  async receiveWebhook(
    channel: InventoryChannel,
    payload: ChannelWebhookDto,
    signature?: string,
  ): Promise<void> {
    this.validateChannelSignature(channel, payload, signature);

    const existed = await this.webhookEventsRepository.findOne({
      where: { channel, externalEventId: payload.event_id },
    });
    if (existed) {
      return;
    }

    const created = this.webhookEventsRepository.create({
      channel,
      externalEventId: payload.event_id,
      payload: payload.payload,
      processedAt: null,
    });
    await this.webhookEventsRepository.save(created);

    await this.queuePort.enqueue(
      InventoryJobName.WEBHOOK_EVENT,
      {
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
    channel: InventoryChannel,
    eventId: string,
  ): Promise<void> {
    await this.webhookEventsRepository.update(
      { channel, externalEventId: eventId },
      { processedAt: new Date() },
    );
  }

  async getWebhookPayload(
    channel: InventoryChannel,
    eventId: string,
  ): Promise<Record<string, unknown>> {
    const event = await this.webhookEventsRepository.findOne({
      where: { channel, externalEventId: eventId },
    });
    if (!event) {
      throw new BadRequestException({
        message: 'Webhook event not found',
        details: { code: 'WEBHOOK_EVENT_NOT_FOUND' },
      });
    }
    return event.payload;
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
