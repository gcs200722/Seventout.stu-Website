import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorizationModule } from '../../core/authorization/authorization.module';
import { OrderEntity } from '../orders/entities/order.entity';
import { RefundEntity } from '../refunds/entities/refund.entity';
import { ReturnEntity } from '../returns/entities/return.entity';
import { UserEntity } from '../../core/users/user.entity';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OrderEntity,
      ReturnEntity,
      RefundEntity,
      UserEntity,
    ]),
    AuthorizationModule,
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
