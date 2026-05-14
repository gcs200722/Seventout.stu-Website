import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, QueryFailedError, Repository } from 'typeorm';
import { AuthenticatedUser } from '../auth/auth.types';
import { UserRole } from '../authorization/authorization.types';
import { OrderEntity } from '../orders/entities/order.entity';
import type { QueuePort } from '../queue/queue.port';
import { QUEUE_PORT } from '../queue/queue.constants';
import { UserEntity } from '../users/user.entity';
import { ListNotificationsQueryDto } from './dto/list-notifications.query.dto';
import { NotificationDeliveryAttemptEntity } from './entities/notification-delivery-attempt.entity';
import { NotificationEntity } from './entities/notification.entity';
import { NotificationEmailService } from './notification-email.service';
import {
  NotificationChannel,
  NotificationEventSource,
  NotificationType,
} from './notification.types';
import { Inject } from '@nestjs/common';

type NotificationTemplate = {
  type: NotificationType;
  title: string;
  content: string;
  channels: NotificationChannel[];
};

type CreateDomainNotificationInput = {
  userId: string;
  recipientEmail?: string | null;
  type: NotificationType;
  title: string;
  content: string;
  channel: NotificationChannel;
  metadata?: Record<string, unknown>;
  eventSource: NotificationEventSource;
  eventId: string;
};

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectRepository(NotificationEntity)
    private readonly notificationsRepository: Repository<NotificationEntity>,
    @InjectRepository(NotificationDeliveryAttemptEntity)
    private readonly attemptsRepository: Repository<NotificationDeliveryAttemptEntity>,
    @InjectRepository(OrderEntity)
    private readonly ordersRepository: Repository<OrderEntity>,
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
    private readonly notificationEmailService: NotificationEmailService,
    @Inject(QUEUE_PORT) private readonly queuePort: QueuePort,
  ) {}

  async listNotifications(
    user: AuthenticatedUser,
    query: ListNotificationsQueryDto,
  ): Promise<{ items: NotificationEntity[]; total: number }> {
    const qb = this.notificationsRepository
      .createQueryBuilder('notification')
      .where('notification.user_id = :userId', { userId: user.id })
      .andWhere('notification.channel = :channel', {
        channel: NotificationChannel.SYSTEM,
      });

    if (query.is_read !== undefined) {
      qb.andWhere('notification.is_read = :isRead', { isRead: query.is_read });
    }

    qb.orderBy('notification.created_at', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit);

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  async markAsRead(
    user: AuthenticatedUser,
    notificationId: string,
  ): Promise<void> {
    const notification = await this.notificationsRepository.findOne({
      where: { id: notificationId },
    });
    if (!notification) {
      throw new NotFoundException({
        message: 'Notification not found',
        details: { code: 'NOTIFICATION_NOT_FOUND' },
      });
    }
    if (notification.userId !== user.id) {
      throw new BadRequestException({
        message: 'Notification does not belong to user',
        details: { code: 'NOTIFICATION_FORBIDDEN' },
      });
    }
    if (notification.isRead) {
      return;
    }
    notification.isRead = true;
    notification.readAt = new Date();
    await this.notificationsRepository.save(notification);
  }

  async markAllAsRead(user: AuthenticatedUser): Promise<number> {
    const result = await this.notificationsRepository
      .createQueryBuilder()
      .update(NotificationEntity)
      .set({ isRead: true, readAt: new Date() })
      .where('user_id = :userId', { userId: user.id })
      .andWhere('is_read = false')
      .execute();
    return result.affected ?? 0;
  }

  async notifyReviewApprovedOwner(input: {
    ownerUserId: string;
    reviewId: string;
    productId: string;
    eventId: string;
  }): Promise<void> {
    const user = await this.usersRepository.findOne({
      where: { id: input.ownerUserId },
    });
    if (!user) {
      return;
    }
    const template: NotificationTemplate = {
      type: NotificationType.REVIEW_APPROVED,
      title: 'Đánh giá của bạn đã hiển thị',
      content: `Đánh giá của bạn cho sản phẩm đã được duyệt và hiển thị trên trang sản phẩm.`,
      channels: [NotificationChannel.SYSTEM],
    };
    await this.dispatchTemplate(
      { userId: user.id, email: user.email },
      template,
      'review.outbox',
      input.eventId,
      {
        review_id: input.reviewId,
        product_id: input.productId,
      },
    );
  }

  async notifyAdminsReviewSubmitted(input: {
    reviewId: string;
    reviewerUserId: string;
    productId: string;
    eventId: string;
  }): Promise<void> {
    const adminRecipients = await this.usersRepository.find({
      where: {
        role: UserRole.ADMIN,
      },
    });
    if (adminRecipients.length === 0) {
      return;
    }
    const template: NotificationTemplate = {
      type: NotificationType.REVIEW_SUBMITTED,
      title: 'Có đánh giá sản phẩm mới',
      content:
        'Một đánh giá mới vừa được gửi và đang chờ duyệt. Vui lòng vào trang quản trị đánh giá để kiểm tra.',
      channels: [NotificationChannel.SYSTEM],
    };
    for (const recipient of adminRecipients) {
      await this.dispatchTemplate(
        {
          userId: recipient.id,
          email: recipient.email,
        },
        template,
        'review.outbox',
        `${input.eventId}:admin:${recipient.id}`,
        {
          review_id: input.reviewId,
          reviewer_user_id: input.reviewerUserId,
          product_id: input.productId,
          audience: 'ADMIN',
          action_url: '/admin/reviews',
        },
      );
    }
  }

  async notifyAdminsReviewReported(input: {
    reviewId: string;
    reporterUserId: string;
    reason: string;
    eventId: string;
  }): Promise<void> {
    const adminRecipients = await this.usersRepository.find({
      where: {
        role: In([UserRole.ADMIN, UserRole.STAFF]),
      },
    });
    if (adminRecipients.length === 0) {
      return;
    }
    const template: NotificationTemplate = {
      type: NotificationType.REVIEW_REPORTED,
      title: 'Review bị báo cáo',
      content: `Một đánh giá (${input.reviewId}) vừa bị báo cáo với lý do: ${input.reason}.`,
      channels: [NotificationChannel.SYSTEM],
    };
    for (const recipient of adminRecipients) {
      await this.dispatchTemplate(
        {
          userId: recipient.id,
          email: recipient.email,
        },
        template,
        'review.outbox',
        `${input.eventId}:admin:${recipient.id}`,
        {
          review_id: input.reviewId,
          reporter_user_id: input.reporterUserId,
          reason: input.reason,
          audience: 'ADMIN',
        },
      );
    }
  }

  async notifyOrderCreated(orderId: string, eventId: string): Promise<void> {
    const target = await this.getOrderRecipient(orderId);
    if (!target) {
      return;
    }
    const template: NotificationTemplate = {
      type: NotificationType.ORDER_CREATED,
      title: 'Order created successfully',
      content: `Your order ${orderId} has been created and is being processed.`,
      channels: [NotificationChannel.SYSTEM, NotificationChannel.EMAIL],
    };
    await this.dispatchTemplate(target, template, 'order.outbox', eventId, {
      order_id: orderId,
    });

    await this.notifyAdminsOrderCreated(orderId, eventId);
  }

  async notifyPaymentResult(
    orderId: string,
    status: 'SUCCESS' | 'FAILED',
    eventId: string,
  ): Promise<void> {
    const target = await this.getOrderRecipient(orderId);
    if (!target) {
      return;
    }
    const isSuccess = status === 'SUCCESS';
    const template: NotificationTemplate = isSuccess
      ? {
          type: NotificationType.PAYMENT_SUCCESS,
          title: 'Payment successful',
          content: `Payment for order ${orderId} is successful.`,
          channels: [NotificationChannel.SYSTEM, NotificationChannel.EMAIL],
        }
      : {
          type: NotificationType.PAYMENT_FAILED,
          title: 'Payment failed',
          content: `Payment for order ${orderId} failed. Please retry.`,
          channels: [NotificationChannel.SYSTEM, NotificationChannel.EMAIL],
        };
    await this.dispatchTemplate(target, template, 'payment.event', eventId, {
      order_id: orderId,
      payment_status: status,
    });
  }

  async notifyFulfillmentStatus(
    orderId: string,
    status: 'SHIPPED' | 'DELIVERED',
    eventId: string,
  ): Promise<void> {
    const target = await this.getOrderRecipient(orderId);
    if (!target) {
      return;
    }
    const template: NotificationTemplate =
      status === 'SHIPPED'
        ? {
            type: NotificationType.FULFILLMENT_SHIPPED,
            title: 'Order shipped',
            content: `Order ${orderId} has been shipped.`,
            channels: [NotificationChannel.SYSTEM, NotificationChannel.EMAIL],
          }
        : {
            type: NotificationType.FULFILLMENT_DELIVERED,
            title: 'Order delivered',
            content: `Order ${orderId} has been delivered.`,
            channels: [NotificationChannel.SYSTEM, NotificationChannel.EMAIL],
          };
    await this.dispatchTemplate(
      target,
      template,
      'fulfillment.event',
      eventId,
      {
        order_id: orderId,
        fulfillment_status: status,
      },
    );
  }

  async processEmailJob(payload: {
    notification_id: string;
    to: string;
    subject: string;
    content: string;
  }): Promise<void> {
    const notification = await this.notificationsRepository.findOne({
      where: { id: payload.notification_id },
    });
    if (!notification) {
      return;
    }

    try {
      await this.notificationEmailService.sendEmail({
        to: payload.to,
        subject: payload.subject,
        content: payload.content,
      });
      this.logger.log(`Email sent to ${payload.to}: ${payload.subject}`);
      await this.attemptsRepository.save(
        this.attemptsRepository.create({
          notificationId: payload.notification_id,
          status: 'SUCCESS',
          metadata: { to: payload.to, subject: payload.subject },
        }),
      );
    } catch (error) {
      await this.attemptsRepository.save(
        this.attemptsRepository.create({
          notificationId: payload.notification_id,
          status: 'FAILED',
          errorMessage:
            error instanceof Error ? error.message : 'Unknown error',
          metadata: { to: payload.to, subject: payload.subject },
        }),
      );
      throw error;
    }
  }

  private async dispatchTemplate(
    target: { userId: string; email: string | null },
    template: NotificationTemplate,
    eventSource: NotificationEventSource,
    eventId: string,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    let systemNotification: NotificationEntity | null = null;
    if (template.channels.includes(NotificationChannel.SYSTEM)) {
      systemNotification = await this.createNotificationRecord({
        userId: target.userId,
        recipientEmail: target.email,
        type: template.type,
        title: template.title,
        content: template.content,
        channel: NotificationChannel.SYSTEM,
        metadata,
        eventSource,
        eventId,
      });
    }

    if (
      template.channels.includes(NotificationChannel.EMAIL) &&
      target.email &&
      systemNotification
    ) {
      await this.queuePort.enqueue(
        'send_email',
        {
          notification_id: systemNotification.id,
          to: target.email,
          subject: template.title,
          content: template.content,
        },
        { attempts: 3, backoffMs: 1000 },
      );
    }
  }

  private async createNotificationRecord(
    input: CreateDomainNotificationInput,
  ): Promise<NotificationEntity | null> {
    try {
      return await this.notificationsRepository.save(
        this.notificationsRepository.create({
          userId: input.userId,
          recipientEmail: input.recipientEmail ?? null,
          type: input.type,
          title: input.title,
          content: input.content,
          channel: input.channel,
          metadata: input.metadata ?? {},
          isRead: false,
          eventSource: input.eventSource,
          eventId: input.eventId,
          readAt: null,
        }),
      );
    } catch (error) {
      if (this.isDuplicateDedupeError(error)) {
        return null;
      }
      throw error;
    }
  }

  private async getOrderRecipient(
    orderId: string,
  ): Promise<{ userId: string; email: string | null } | null> {
    const order = await this.ordersRepository.findOne({
      where: { id: orderId },
    });
    if (!order) {
      return null;
    }
    if (!order.userId) {
      return null;
    }
    const user = await this.usersRepository.findOne({
      where: { id: order.userId },
    });
    return {
      userId: order.userId,
      email: user?.email ?? null,
    };
  }

  private async notifyAdminsOrderCreated(
    orderId: string,
    eventId: string,
  ): Promise<void> {
    const adminRecipients = await this.usersRepository.find({
      where: {
        role: In([UserRole.ADMIN, UserRole.STAFF]),
      },
    });
    if (adminRecipients.length === 0) {
      return;
    }

    const adminTemplate: NotificationTemplate = {
      type: NotificationType.ORDER_CREATED,
      title: 'New order received',
      content: `A new customer order ${orderId} has been created.`,
      channels: [NotificationChannel.SYSTEM],
    };

    for (const recipient of adminRecipients) {
      await this.dispatchTemplate(
        {
          userId: recipient.id,
          email: recipient.email,
        },
        adminTemplate,
        'order.outbox',
        `${eventId}:admin:${recipient.id}`,
        {
          order_id: orderId,
          audience: 'ADMIN',
        },
      );
    }
  }

  private isDuplicateDedupeError(error: unknown): boolean {
    if (!(error instanceof QueryFailedError)) {
      return false;
    }
    const driverError = error.driverError as
      | { code?: string; constraint?: string }
      | undefined;
    return (
      driverError?.code === '23505' &&
      driverError?.constraint === 'uq_notifications_dedupe'
    );
  }
}
