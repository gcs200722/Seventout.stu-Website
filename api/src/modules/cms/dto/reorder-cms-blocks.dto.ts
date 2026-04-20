import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsUUID } from 'class-validator';

export class ReorderCmsBlocksDto {
  @ApiProperty({
    type: [String],
    description: 'Every block id in this section, in display order',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(64)
  @IsUUID('4', { each: true })
  block_ids: string[];
}
