export const ORDER_PAYMENT_PORT = Symbol('ORDER_PAYMENT_PORT');

export interface OrderPaymentPort {
  onOrderCreated(orderId: string): Promise<void>;
  onOrderCanceled(orderId: string): Promise<void>;
  onOrderCompleted(orderId: string): Promise<void>;
}

export class NoopOrderPaymentAdapter implements OrderPaymentPort {
  onOrderCreated(orderId: string): Promise<void> {
    void orderId;
    return Promise.resolve();
  }
  onOrderCanceled(orderId: string): Promise<void> {
    void orderId;
    return Promise.resolve();
  }
  onOrderCompleted(orderId: string): Promise<void> {
    void orderId;
    return Promise.resolve();
  }
}
