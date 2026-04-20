import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CmsAssetRegisterDto {
  @ApiProperty({ example: 'cms/assets/uuid-file.jpg' })
  @IsString()
  @MinLength(4)
  @MaxLength(512)
  object_key: string;

  @ApiProperty({ example: 'https://cdn.example.com/cms/assets/uuid-file.jpg' })
  @IsUrl({ require_protocol: true })
  @MaxLength(2048)
  public_url: string;

  @ApiProperty({ example: 'image/jpeg' })
  @IsString()
  @MaxLength(128)
  mime: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(512)
  alt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  width?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  height?: number;
}
