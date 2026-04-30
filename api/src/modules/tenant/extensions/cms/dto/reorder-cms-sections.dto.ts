import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsUUID } from 'class-validator';

export class ReorderCmsSectionsDto {
  @ApiProperty({
    type: [String],
    description: 'Every section id on the page, in display order',
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  section_ids: string[];
}
