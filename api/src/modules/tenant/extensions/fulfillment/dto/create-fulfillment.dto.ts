import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateFulfillmentDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  order_id: string;

  @ApiProperty({ example: 'GHN', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  shipping_provider?: string;

  @ApiProperty({ required: false, example: 'Pack with care' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
