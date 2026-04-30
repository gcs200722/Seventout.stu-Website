import { Injectable } from '@nestjs/common';
import { FulfillmentService } from '../../fulfillment/fulfillment.service';
import type { OrderFulfillmentPort } from '../ports/order-fulfillment.port';

@Injectable()
export class OrderFulfillmentAdapter implements OrderFulfillmentPort {
  constructor(private readonly fulfillmentService: FulfillmentService) {}

  async onOrderCreated(orderId: string): Promise<void> {
    await this.fulfillmentService.createForOrderLifecycle(orderId);
  }

  async onOrderPaymentSucceeded(orderId: string): Promise<void> {
    await this.fulfillmentService.createForOrderLifecycle(orderId);
  }

  async onOrderCanceled(orderId: string): Promise<void> {
    await this.fulfillmentService.cancelByOrderId(orderId);
  }

  onOrderCompleted(orderId: string): Promise<void> {
    void orderId;
    return Promise.resolve();
  }
}
