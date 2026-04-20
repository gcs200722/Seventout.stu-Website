import { ApiPropertyOptional } from '@nestjs/swagger';
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

export class UpdateCmsBlockDto {
  @ApiPropertyOptional({ enum: CmsBlockType })
  @IsOptional()
  @IsEnum(CmsBlockType)
  type?: CmsBlockType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;

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

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  appearance?: Record<string, unknown>;
}
