export const ORDER_FULFILLMENT_PORT = Symbol('ORDER_FULFILLMENT_PORT');

export interface OrderFulfillmentPort {
  onOrderCreated(orderId: string): Promise<void>;
  onOrderCanceled(orderId: string): Promise<void>;
  onOrderCompleted(orderId: string): Promise<void>;
}

export class NoopOrderFulfillmentAdapter implements OrderFulfillmentPort {
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
