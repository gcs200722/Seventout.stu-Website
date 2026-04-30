import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class AddWishlistItemDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  product_id: string;
}
