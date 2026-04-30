import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { FulfillmentShippingStatus } from '../fulfillment.types';

export enum ManageableFulfillmentStatus {
  CONFIRMED = FulfillmentShippingStatus.CONFIRMED,
  PACKING = FulfillmentShippingStatus.PACKING,
  SHIPPED = FulfillmentShippingStatus.SHIPPED,
  DELIVERED = FulfillmentShippingStatus.DELIVERED,
  CANCELLED = FulfillmentShippingStatus.CANCELLED,
  FAILED_DELIVERY = FulfillmentShippingStatus.FAILED_DELIVERY,
}

export class UpdateFulfillmentStatusDto {
  @ApiProperty({ enum: ManageableFulfillmentStatus })
  @IsEnum(ManageableFulfillmentStatus)
  status: FulfillmentShippingStatus;

  @ApiProperty({ required: false, example: 'GHN123456789' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  tracking_code?: string;

  @ApiProperty({ required: false, example: 'GHN' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  shipping_provider?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
