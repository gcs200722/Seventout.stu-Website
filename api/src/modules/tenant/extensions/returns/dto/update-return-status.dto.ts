import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ReturnStatus } from '../returns.types';

export enum ManageableReturnStatus {
  APPROVED = ReturnStatus.APPROVED,
  RECEIVED = ReturnStatus.RECEIVED,
  COMPLETED = ReturnStatus.COMPLETED,
  REJECTED = ReturnStatus.REJECTED,
  CANCELLED = ReturnStatus.CANCELLED,
}

export class UpdateReturnStatusDto {
  @ApiProperty({ enum: ManageableReturnStatus })
  @IsEnum(ManageableReturnStatus)
  status: ReturnStatus;

  @ApiPropertyOptional({ example: 'Verified product condition' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
