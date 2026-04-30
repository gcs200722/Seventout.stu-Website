import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateReturnDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  @Transform(({ value }) => String(value).trim())
  order_id: string;

  @ApiProperty({ example: 'Damaged product' })
  @IsString()
  @MaxLength(500)
  @Transform(({ value }) => String(value).trim())
  reason: string;

  @ApiPropertyOptional({ example: 'Box is broken' })
  @IsString()
  @MaxLength(1000)
  @Transform(({ value }) => String(value ?? '').trim())
  note = '';
}
