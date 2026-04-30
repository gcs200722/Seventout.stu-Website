import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { RefundStatus } from '../refunds.types';

export enum ManageableRefundStatus {
  PROCESSING = RefundStatus.PROCESSING,
  SUCCESS = RefundStatus.SUCCESS,
  FAILED = RefundStatus.FAILED,
}

export class UpdateRefundStatusDto {
  @ApiProperty({ enum: ManageableRefundStatus })
  @IsEnum(ManageableRefundStatus)
  status: RefundStatus;
}
