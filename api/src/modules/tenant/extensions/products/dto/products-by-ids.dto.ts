import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsUUID } from 'class-validator';

export class ProductsByIdsDto {
  @ApiProperty({ type: [String], maxItems: 48 })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(48)
  @IsUUID('4', { each: true })
  ids: string[];
}
