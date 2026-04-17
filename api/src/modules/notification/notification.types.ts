export enum NotificationChannel {
  SYSTEM = 'SYSTEM',
  EMAIL = 'EMAIL',
}

export enum NotificationType {
  ORDER_CREATED = 'ORDER_CREATED',
  PAYMENT_SUCCESS = 'PAYMENT_SUCCESS',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  FULFILLMENT_SHIPPED = 'FULFILLMENT_SHIPPED',
  FULFILLMENT_DELIVERED = 'FULFILLMENT_DELIVERED',
}

export type NotificationEventSource =
  | 'order.outbox'
  | 'payment.event'
  | 'fulfillment.event';
