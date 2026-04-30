import { Injectable } from '@nestjs/common';
import { NotificationService } from '../../../core/notification/notification.service';
import { ReviewEventOutboxEntity } from '../entities/review-event-outbox.entity';
import { ReviewEventType } from '../reviews.types';

@Injectable()
export class ReviewEventDispatcherService {
  constructor(private readonly notificationService: NotificationService) {}

  async dispatch(event: ReviewEventOutboxEntity): Promise<void> {
    const payload = event.payload as {
      review_id?: string;
      owner_user_id?: string;
      product_id?: string;
      reviewer_user_id?: string;
      reporter_user_id?: string;
      reason?: string;
    };

    if (event.eventType === ReviewEventType.REVIEW_SUBMITTED) {
      const reviewId = payload.review_id ?? event.reviewId ?? '';
      const reviewerUserId = payload.reviewer_user_id ?? '';
      const productId = payload.product_id ?? '';
      if (reviewId && reviewerUserId && productId) {
        await this.notificationService.notifyAdminsReviewSubmitted({
          reviewId,
          reviewerUserId,
          productId,
          eventId: event.id,
        });
      }
      return;
    }

    if (event.eventType === ReviewEventType.REVIEW_APPROVED) {
      const reviewId = payload.review_id ?? event.reviewId ?? '';
      const ownerUserId = payload.owner_user_id ?? '';
      const productId = payload.product_id ?? '';
      if (reviewId && ownerUserId && productId) {
        await this.notificationService.notifyReviewApprovedOwner({
          ownerUserId,
          reviewId,
          productId,
          eventId: event.id,
        });
      }
      return;
    }

    if (event.eventType === ReviewEventType.REVIEW_REPORTED) {
      const reviewId = payload.review_id ?? event.reviewId ?? '';
      const reporterUserId = payload.reporter_user_id ?? '';
      const reason = payload.reason ?? '';
      if (reviewId && reporterUserId && reason) {
        await this.notificationService.notifyAdminsReviewReported({
          reviewId,
          reporterUserId,
          reason,
          eventId: event.id,
        });
      }
    }
  }
}
