import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ReviewsApplicationService } from './reviews.application.service';

@Injectable()
export class ReviewOutboxProcessor {
  private readonly logger = new Logger(ReviewOutboxProcessor.name);

  constructor(
    private readonly reviewsApplicationService: ReviewsApplicationService,
  ) {}

  @Cron(CronExpression.EVERY_10_SECONDS)
  async processPendingEvents(): Promise<void> {
    try {
      await this.reviewsApplicationService.processOutbox();
    } catch (error) {
      this.logger.error(
        'Review outbox processing failed',
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
