import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OrdersService } from './orders.service';

@Injectable()
export class OrderOutboxProcessor {
  private readonly logger = new Logger(OrderOutboxProcessor.name);

  constructor(private readonly ordersService: OrdersService) {}

  @Cron(CronExpression.EVERY_10_SECONDS)
  async processPendingEvents(): Promise<void> {
    try {
      await this.ordersService.processOutbox();
    } catch (error) {
      this.logger.error(
        'Order outbox processing failed',
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
