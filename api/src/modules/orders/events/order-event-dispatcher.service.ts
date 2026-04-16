import { Inject, Injectable } from '@nestjs/common';
import { ORDER_FULFILLMENT_PORT } from '../ports/order-fulfillment.port';
import type { OrderFulfillmentPort } from '../ports/order-fulfillment.port';
import { ORDER_INVENTORY_PORT } from '../ports/order-inventory.port';
import type { OrderInventoryPort } from '../ports/order-inventory.port';
import { ORDER_PAYMENT_PORT } from '../ports/order-payment.port';
import type { OrderPaymentPort } from '../ports/order-payment.port';
import { OrderEventType } from '../orders.types';
import { OrderEventOutboxEntity } from '../entities/order-event-outbox.entity';

@Injectable()
export class OrderEventDispatcherService {
  constructor(
    @Inject(ORDER_INVENTORY_PORT)
    private readonly inventoryPort: OrderInventoryPort,
    @Inject(ORDER_PAYMENT_PORT)
    private readonly paymentPort: OrderPaymentPort,
    @Inject(ORDER_FULFILLMENT_PORT)
    private readonly fulfillmentPort: OrderFulfillmentPort,
  ) {}

  async dispatch(event: OrderEventOutboxEntity): Promise<void> {
    const payload = event.payload as {
      order_id: string;
      items?: Array<{ product_id: string; quantity: number }>;
    };

    if (event.eventType === OrderEventType.ORDER_CREATED) {
      for (const item of payload.items ?? []) {
        await this.inventoryPort.reserveStock(
          item.product_id,
          item.quantity,
          'Order created: reserve stock',
        );
      }
      await this.paymentPort.onOrderCreated(payload.order_id);
      await this.fulfillmentPort.onOrderCreated(payload.order_id);
      return;
    }

    if (event.eventType === OrderEventType.ORDER_CANCELED) {
      for (const item of payload.items ?? []) {
        await this.inventoryPort.releaseStock(
          item.product_id,
          item.quantity,
          'Order canceled: release stock',
        );
      }
      await this.paymentPort.onOrderCanceled(payload.order_id);
      await this.fulfillmentPort.onOrderCanceled(payload.order_id);
      return;
    }

    if (event.eventType === OrderEventType.ORDER_COMPLETED) {
      for (const item of payload.items ?? []) {
        await this.inventoryPort.commitStockOut(
          item.product_id,
          item.quantity,
          'Order completed: commit stock out',
        );
      }
      await this.paymentPort.onOrderCompleted(payload.order_id);
      await this.fulfillmentPort.onOrderCompleted(payload.order_id);
    }
  }
}
