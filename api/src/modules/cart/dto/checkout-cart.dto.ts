import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CheckoutCartDto {
  @ApiPropertyOptional({
    description:
      'Idempotency key from client to avoid duplicate checkout requests.',
    example: 'checkout-20260416-001',
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(120)
  idempotency_key?: string;
}
