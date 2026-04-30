import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { DiscountType, PromotionCampaignType } from '../promotions.types';

export class CreateCampaignDto {
  @ApiProperty()
  @IsString()
  @MaxLength(255)
  name!: string;

  @ApiProperty({ enum: PromotionCampaignType })
  @IsEnum(PromotionCampaignType)
  type!: PromotionCampaignType;

  @ApiProperty({ enum: DiscountType })
  @IsEnum(DiscountType)
  discount_type!: DiscountType;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  value!: number;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(0)
  max_discount?: number | null;

  @ApiPropertyOptional({ default: 0 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  priority?: number;

  @ApiProperty()
  @IsDateString()
  start_date!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  end_date?: string | null;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
