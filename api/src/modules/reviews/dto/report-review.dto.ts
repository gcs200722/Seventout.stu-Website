import { IsEnum } from 'class-validator';
import { ReviewReportReason } from '../reviews.types';

export class ReportReviewDto {
  @IsEnum(ReviewReportReason)
  reason: ReviewReportReason;
}
