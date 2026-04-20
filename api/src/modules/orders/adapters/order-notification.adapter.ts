import { Injectable } from '@nestjs/common';
import { NotificationService } from '../../notification/notification.service';
import { OrderNotificationPort } from '../ports/order-notification.port';

@Injectable()
export class OrderNotificationAdapter implements OrderNotificationPort {
  constructor(private readonly notificationService: NotificationService) {}

  async onOrderCreated(orderId: string, eventId: string): Promise<void> {
    await this.notificationService.notifyOrderCreated(orderId, eventId);
  }
}
