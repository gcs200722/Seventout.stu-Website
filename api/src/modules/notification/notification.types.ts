export enum NotificationChannel {
  SYSTEM = 'SYSTEM',
  EMAIL = 'EMAIL',
}

export enum NotificationType {
  REVIEW_SUBMITTED = 'REVIEW_SUBMITTED',
  ORDER_CREATED = 'ORDER_CREATED',
  PAYMENT_SUCCESS = 'PAYMENT_SUCCESS',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  FULFILLMENT_SHIPPED = 'FULFILLMENT_SHIPPED',
  FULFILLMENT_DELIVERED = 'FULFILLMENT_DELIVERED',
  REVIEW_APPROVED = 'REVIEW_APPROVED',
  REVIEW_REPORTED = 'REVIEW_REPORTED',
}

export type NotificationEventSource =
  | 'order.outbox'
  | 'payment.event'
  | 'fulfillment.event'
  | 'review.outbox';
