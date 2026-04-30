import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class AddProductVariantDto {
  @ApiProperty({ example: 'Đen' })
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  color: string;

  @ApiProperty({ example: 'M' })
  @IsString()
  @MinLength(1)
  @MaxLength(32)
  size: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sort_order?: number;
}
