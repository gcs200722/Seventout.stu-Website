import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorizationModule } from '../authorization/authorization.module';
import { CartModule } from '../cart/cart.module';
import { FulfillmentModule } from '../fulfillment/fulfillment.module';
import { NotificationModule } from '../notification/notification.module';
import { CartItemEntity } from '../cart/entities/cart-item.entity';
import { CartEntity } from '../cart/entities/cart.entity';
import { InventoryModule } from '../inventory/inventory.module';
import { PaymentEntity } from '../payments/entities/payment.entity';
import { ProductEntity } from '../products/product.entity';
import { AddressEntity } from '../address/entities/address.entity';
import { OrderCartAdapter } from './adapters/order-cart.adapter';
import { OrderFulfillmentAdapter } from './adapters/order-fulfillment.adapter';
import { OrderInventoryAdapter } from './adapters/order-inventory.adapter';
import { OrderNotificationAdapter } from './adapters/order-notification.adapter';
import { OrdersController } from './orders.controller';
import { OrderEventOutboxEntity } from './entities/order-event-outbox.entity';
import { OrderItemEntity } from './entities/order-item.entity';
import { OrderEntity } from './entities/order.entity';
import { OrderEventDispatcherService } from './events/order-event-dispatcher.service';
import { OrderOutboxProcessor } from './order-outbox.processor';
import { OrderQueryService } from './order-query.service';
import { OrderStatusPolicy } from './order-status.policy';
import { ORDER_FULFILLMENT_PORT } from './ports/order-fulfillment.port';
import { ORDER_CART_PORT } from './ports/order-cart.port';
import { ORDER_INVENTORY_PORT } from './ports/order-inventory.port';
import {
  NoopOrderPaymentAdapter,
  ORDER_PAYMENT_PORT,
} from './ports/order-payment.port';
import { ORDER_NOTIFICATION_PORT } from './ports/order-notification.port';
import { PromotionsModule } from '../promotions/promotions.module';
import { OrdersService } from './orders.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    AuditModule,
    TypeOrmModule.forFeature([
      OrderEntity,
      OrderItemEntity,
      OrderEventOutboxEntity,
      CartEntity,
      CartItemEntity,
      ProductEntity,
      AddressEntity,
      PaymentEntity,
    ]),
    AuthorizationModule,
    CartModule,
    FulfillmentModule,
    InventoryModule,
    NotificationModule,
    PromotionsModule,
  ],
  controllers: [OrdersController],
  providers: [
    OrdersService,
    OrderEventDispatcherService,
    OrderOutboxProcessor,
    OrderQueryService,
    OrderStatusPolicy,
    { provide: ORDER_CART_PORT, useClass: OrderCartAdapter },
    { provide: ORDER_INVENTORY_PORT, useClass: OrderInventoryAdapter },
    { provide: ORDER_PAYMENT_PORT, useClass: NoopOrderPaymentAdapter },
    {
      provide: ORDER_NOTIFICATION_PORT,
      useClass: OrderNotificationAdapter,
    },
    {
      provide: ORDER_FULFILLMENT_PORT,
      useClass: OrderFulfillmentAdapter,
    },
  ],
  exports: [OrdersService],
})
export class OrdersModule {}
