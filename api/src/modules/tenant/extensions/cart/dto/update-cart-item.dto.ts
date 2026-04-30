import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsUUID, Min } from 'class-validator';

export class UpdateCartItemDto {
  @ApiProperty({ example: 2, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiProperty({
    example: '78ff6607-8c95-4eab-981e-3236d2b1d6f4',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  product_variant_id?: string;
}
