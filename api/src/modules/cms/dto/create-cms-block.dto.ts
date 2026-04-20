import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  Min,
} from 'class-validator';
import { CmsBlockType } from '../cms.types';

export class CreateCmsBlockDto {
  @ApiProperty({ enum: CmsBlockType })
  @IsEnum(CmsBlockType)
  type: CmsBlockType;

  @ApiProperty({
    description: 'Block-specific payload (validated server-side by type)',
    example: { image_url: 'https://...', title: 'Sale', subtitle: '' },
  })
  @IsObject()
  data: Record<string, unknown>;

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
    description: 'Optional per-block presentation JSON (ratio, rounded, …)',
  })
  @IsOptional()
  @IsObject()
  appearance?: Record<string, unknown>;
}
