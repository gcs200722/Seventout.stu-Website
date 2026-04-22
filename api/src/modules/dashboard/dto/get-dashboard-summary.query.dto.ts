import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';

export enum DashboardComparePreset {
  YESTERDAY = 'YESTERDAY',
  LAST_WEEK_SAME_DAY = 'LAST_WEEK_SAME_DAY',
  AVG_LAST_7_DAYS = 'AVG_LAST_7_DAYS',
}

export class GetDashboardSummaryQueryDto {
  @ApiPropertyOptional({ enum: DashboardComparePreset })
  @IsOptional()
  @IsEnum(DashboardComparePreset)
  compare: DashboardComparePreset = DashboardComparePreset.YESTERDAY;
}
