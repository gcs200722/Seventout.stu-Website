import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorizationModule } from '../authorization/authorization.module';
import { OrderEntity } from '../orders/entities/order.entity';
import { ReturnEntity } from './entities/return.entity';
import { ReturnsController } from './returns.controller';
import { ReturnsService } from './returns.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ReturnEntity, OrderEntity]),
    AuthorizationModule,
  ],
  controllers: [ReturnsController],
  providers: [ReturnsService],
  exports: [ReturnsService],
})
export class ReturnsModule {}
