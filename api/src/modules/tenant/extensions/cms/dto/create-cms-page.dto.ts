import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateCmsPageDto {
  @ApiProperty({ example: 'landing_sale' })
  @IsString()
  @MinLength(2)
  @MaxLength(64)
  page_key: string;

  @ApiProperty({ example: 'Sale landing' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
