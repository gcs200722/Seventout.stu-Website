import { Module } from '@nestjs/common';
import { AuthorizationModule } from '../authorization/authorization.module';
import { OrdersController } from './orders.controller';

@Module({
  imports: [AuthorizationModule],
  controllers: [OrdersController],
})
export class OrdersModule {}
