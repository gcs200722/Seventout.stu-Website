import { Transform } from 'class-transformer';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  IsUrl,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

function normalizeStringArrayInput(value: unknown): unknown {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  if (Array.isArray(value)) {
    return value;
  }
  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (
        Array.isArray(parsed) &&
        parsed.every((item) => typeof item === 'string')
      ) {
        return parsed;
      }
      return [trimmed];
    } catch {
      return [trimmed];
    }
  }
  return [trimmed];
}

export class CreateProductDto {
  @ApiProperty({ example: 'Hoodie Local Brand' })
  @Transform(({ value }: { value: unknown }) => {
    if (typeof value === 'string') {
      return value.trim();
    }
    return value;
  })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name: string;

  @ApiProperty({ example: 'Áo hoodie chất liệu nỉ cao cấp' })
  @Transform(({ value }: { value: unknown }) => {
    if (typeof value === 'string') {
      return value.trim();
    }
    return value;
  })
  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  description: string;

  @ApiProperty({ example: 350000 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  price: number;

  @ApiProperty({ example: '78ff6607-8c95-4eab-981e-3236d2b1d6f4' })
  @IsUUID()
  category_id: string;

  @ApiProperty({
    example: ['https://cdn.example.com/product/hoodie1.jpg'],
    type: [String],
    required: false,
    description: 'Optional when uploading files with multipart field "images".',
  })
  @Transform(({ value }: { value: unknown }) =>
    normalizeStringArrayInput(value),
  )
  @IsOptional()
  @IsArray()
  @IsUrl({ require_protocol: true }, { each: true })
  @MaxLength(500, { each: true })
  images?: string[];
}
