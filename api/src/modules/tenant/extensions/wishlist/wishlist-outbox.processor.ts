import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { WishlistApplicationService } from './wishlist.application.service';

@Injectable()
export class WishlistOutboxProcessor {
  private readonly logger = new Logger(WishlistOutboxProcessor.name);

  constructor(
    private readonly wishlistApplicationService: WishlistApplicationService,
  ) {}

  @Cron(CronExpression.EVERY_10_SECONDS)
  async processPendingEvents(): Promise<void> {
    try {
      await this.wishlistApplicationService.processOutbox();
    } catch (error) {
      this.logger.error(
        'Wishlist outbox processing failed',
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
