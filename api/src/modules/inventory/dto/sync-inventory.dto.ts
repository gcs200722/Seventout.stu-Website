import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsUUID } from 'class-validator';
import { ExternalInventoryChannel, InventoryChannel } from '../inventory.types';

export class SyncInventoryDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  product_variant_id: string;

  @ApiProperty({ enum: ExternalInventoryChannel })
  @IsEnum(ExternalInventoryChannel)
  channel: InventoryChannel.SHOPEE | InventoryChannel.TIKTOK;
}
