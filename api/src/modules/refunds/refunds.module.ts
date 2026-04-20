import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorizationModule } from '../authorization/authorization.module';
import { OrderEntity } from '../orders/entities/order.entity';
import { PaymentEntity } from '../payments/entities/payment.entity';
import { ReturnEntity } from '../returns/entities/return.entity';
import { RefundEntity } from './entities/refund.entity';
import { RefundsController } from './refunds.controller';
import { RefundsService } from './refunds.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RefundEntity,
      ReturnEntity,
      OrderEntity,
      PaymentEntity,
    ]),
    AuthorizationModule,
  ],
  controllers: [RefundsController],
  providers: [RefundsService],
  exports: [RefundsService],
})
export class RefundsModule {}
