import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { RefundMethod } from '../refunds.types';

export class CreateRefundDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  @Transform(({ value }) => String(value).trim())
  return_id: string;

  @ApiProperty({ example: 500000 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(2_000_000_000)
  amount: number;

  @ApiPropertyOptional({ enum: RefundMethod })
  @IsOptional()
  @IsEnum(RefundMethod)
  method?: RefundMethod;
}
