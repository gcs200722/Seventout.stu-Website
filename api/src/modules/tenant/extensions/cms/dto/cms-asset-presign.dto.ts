import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CmsAssetPresignDto {
  @ApiProperty({ example: 'image/jpeg' })
  @IsString()
  @MinLength(3)
  @MaxLength(128)
  content_type: string;

  @ApiProperty({ example: 'hero.jpg', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Matches(/^[a-zA-Z0-9._-]+$/, {
    message: 'filename must be alphanumeric with . _ - only',
  })
  filename?: string;
}
