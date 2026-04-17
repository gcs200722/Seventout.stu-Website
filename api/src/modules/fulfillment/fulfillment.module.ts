import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorizationModule } from '../authorization/authorization.module';
import { NotificationModule } from '../notification/notification.module';
import { OrderEventOutboxEntity } from '../orders/entities/order-event-outbox.entity';
import { OrderItemEntity } from '../orders/entities/order-item.entity';
import { OrderEntity } from '../orders/entities/order.entity';
import { PaymentEntity } from '../payments/entities/payment.entity';
import { FulfillmentController } from './fulfillment.controller';
import { FulfillmentService } from './fulfillment.service';
import { FulfillmentEntity } from './entities/fulfillment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FulfillmentEntity,
      OrderEntity,
      OrderItemEntity,
      OrderEventOutboxEntity,
      PaymentEntity,
    ]),
    AuthorizationModule,
    NotificationModule,
  ],
  controllers: [FulfillmentController],
  providers: [FulfillmentService],
  exports: [FulfillmentService],
})
export class FulfillmentModule {}
