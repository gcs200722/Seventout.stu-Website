import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsObject, IsString, MaxLength } from 'class-validator';

export class ChannelWebhookDto {
  @ApiProperty({ example: 'evt_123' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  event_id: string;

  @ApiProperty({ example: { order_id: 'od_1', items: [] } })
  @IsObject()
  payload: Record<string, unknown>;
}
