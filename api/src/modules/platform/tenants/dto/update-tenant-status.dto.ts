import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { TenantStatus } from '../entities/tenant.entity';

export class UpdateTenantStatusDto {
  @ApiProperty({ enum: TenantStatus, example: TenantStatus.SUSPENDED })
  @IsEnum(TenantStatus)
  status: TenantStatus;
}
