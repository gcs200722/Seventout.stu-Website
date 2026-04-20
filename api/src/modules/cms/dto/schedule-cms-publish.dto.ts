import { ApiProperty } from '@nestjs/swagger';
import { IsISO8601 } from 'class-validator';

export class ScheduleCmsPublishDto {
  @ApiProperty({
    description:
      'UTC or offset ISO-8601 instant when cache should be invalidated',
  })
  @IsISO8601()
  run_at: string;
}
