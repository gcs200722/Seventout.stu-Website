export const ORDER_NOTIFICATION_PORT = Symbol('ORDER_NOTIFICATION_PORT');

export interface OrderNotificationPort {
  onOrderCreated(orderId: string, eventId: string): Promise<void>;
}

export class NoopOrderNotificationAdapter implements OrderNotificationPort {
  async onOrderCreated(): Promise<void> {}
}
