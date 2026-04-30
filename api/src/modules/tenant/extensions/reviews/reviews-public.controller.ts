import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ListProductReviewsQueryDto } from './dto/list-product-reviews.query.dto';
import { ReviewsApplicationService } from './reviews.application.service';

@ApiTags('reviews')
@Controller('products')
export class ReviewsPublicController {
  constructor(
    private readonly reviewsApplicationService: ReviewsApplicationService,
  ) {}

  @Get(':productId/review-stats')
  @ApiOperation({ summary: 'Public product review aggregate stats' })
  async getReviewStats(@Param('productId', ParseUUIDPipe) productId: string) {
    const data =
      await this.reviewsApplicationService.getProductReviewStats(productId);
    return { success: true, data };
  }

  @Get(':productId/reviews')
  @ApiOperation({ summary: 'List approved reviews for a product' })
  async listReviews(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Query() query: ListProductReviewsQueryDto,
  ) {
    const { items, total } =
      await this.reviewsApplicationService.listProductReviews(productId, query);
    return {
      success: true,
      data: items,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
      },
    };
  }
}
