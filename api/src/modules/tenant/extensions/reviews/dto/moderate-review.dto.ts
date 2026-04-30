import { IsEnum } from 'class-validator';
import { ReviewStatus } from '../reviews.types';

export class ModerateReviewDto {
  @IsEnum(ReviewStatus)
  status: ReviewStatus;
}
