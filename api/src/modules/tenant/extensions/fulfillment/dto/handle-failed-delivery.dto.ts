import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export enum FailedDeliveryAction {
  RETRY_DELIVERY = 'RETRY_DELIVERY',
  CANCEL_ORDER = 'CANCEL_ORDER',
  RETURN_TO_WAREHOUSE = 'RETURN_TO_WAREHOUSE',
}

export class HandleFailedDeliveryDto {
  @ApiProperty({ enum: FailedDeliveryAction })
  @IsEnum(FailedDeliveryAction)
  action: FailedDeliveryAction;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
