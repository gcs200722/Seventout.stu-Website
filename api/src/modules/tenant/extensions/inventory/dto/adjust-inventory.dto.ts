import { Transform, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import {
  InventoryAdjustType,
  InventoryChannel,
  InventoryMovementType,
} from '../inventory.types';

export class AdjustInventoryDto {
  @ApiProperty({ enum: InventoryChannel })
  @IsEnum(InventoryChannel)
  channel: InventoryChannel;

  @ApiProperty({ enum: InventoryAdjustType })
  @IsEnum(InventoryAdjustType)
  type: InventoryMovementType.IN | InventoryMovementType.OUT;

  @ApiProperty({ example: 20 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiProperty({ example: 'Import hàng' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  reason: string;
}
