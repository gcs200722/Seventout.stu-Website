import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { CmsSectionType } from '../cms.types';

export class CreateCmsSectionDto {
  @ApiProperty({ enum: CmsSectionType })
  @IsEnum(CmsSectionType)
  type: CmsSectionType;

  @ApiProperty({ example: 'Hero' })
  @IsString()
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sort_order?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional({
    description:
      'Optional presentation JSON (padding, max_width, anchor_id, background_color, …)',
  })
  @IsOptional()
  @IsObject()
  layout?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Optional targeting stub (e.g. `{ "device": "mobile" }`)',
  })
  @IsOptional()
  @IsObject()
  targeting?: Record<string, unknown>;
}
