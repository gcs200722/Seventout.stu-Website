import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';

export enum ProductReviewSort {
  latest = 'latest',
  rating = 'rating',
  helpful = 'helpful',
}

export class ListProductReviewsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit = 10;

  @IsOptional()
  @IsEnum(ProductReviewSort)
  sort: ProductReviewSort = ProductReviewSort.latest;
}
