import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { OrderStatus } from '../orders.types';

export enum ManageableOrderStatus {
  CONFIRMED = OrderStatus.CONFIRMED,
  PROCESSING = OrderStatus.PROCESSING,
  SHIPPED = OrderStatus.SHIPPED,
  COMPLETED = OrderStatus.COMPLETED,
}

export class UpdateOrderStatusDto {
  @ApiProperty({ enum: ManageableOrderStatus })
  @IsEnum(ManageableOrderStatus)
  status: OrderStatus;
}
