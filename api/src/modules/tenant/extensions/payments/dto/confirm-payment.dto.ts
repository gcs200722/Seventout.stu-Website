import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsIn } from 'class-validator';
import { PaymentStatus } from '../payments.types';

export class ConfirmPaymentDto {
  @ApiProperty({ enum: [PaymentStatus.SUCCESS, PaymentStatus.FAILED] })
  @IsEnum(PaymentStatus)
  @IsIn([PaymentStatus.SUCCESS, PaymentStatus.FAILED])
  status: PaymentStatus;
}
