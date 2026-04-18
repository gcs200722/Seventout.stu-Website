import {
  Body,
  Controller,
  Delete,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequireRoles } from '../authorization/decorators/require-roles.decorator';
import { AuthorizationGuard } from '../authorization/guards/authorization.guard';
import { UserRole } from '../authorization/authorization.types';
import { CreateReviewDto } from './dto/create-review.dto';
import { ReportReviewDto } from './dto/report-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { ReviewsApplicationService } from './reviews.application.service';

@ApiTags('reviews')
@Controller('reviews')
@UseGuards(JwtAuthGuard, AuthorizationGuard)
@ApiBearerAuth('access-token')
export class ReviewsController {
  constructor(
    private readonly reviewsApplicationService: ReviewsApplicationService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a product review (verified purchase)' })
  @RequireRoles(UserRole.USER)
  async createReview(
    @CurrentUser() user: AuthenticatedUser,
    @Body() payload: CreateReviewDto,
  ) {
    const data = await this.reviewsApplicationService.createReview(
      user,
      payload,
    );
    return { success: true, data };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update own review' })
  @RequireRoles(UserRole.USER)
  async updateReview(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) reviewId: string,
    @Body() payload: UpdateReviewDto,
  ) {
    const data = await this.reviewsApplicationService.updateReview(
      user,
      reviewId,
      payload,
    );
    return { success: true, data };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete own review' })
  @RequireRoles(UserRole.USER)
  async deleteReview(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) reviewId: string,
  ) {
    await this.reviewsApplicationService.deleteReview(user, reviewId);
    return { success: true, data: { id: reviewId } };
  }

  @Post(':id/like')
  @ApiOperation({ summary: 'Mark review as helpful (idempotent)' })
  @RequireRoles(UserRole.USER)
  async likeReview(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) reviewId: string,
  ) {
    const data = await this.reviewsApplicationService.likeReview(
      user,
      reviewId,
    );
    return { success: true, data };
  }

  @Post(':id/report')
  @ApiOperation({ summary: 'Report a review' })
  @RequireRoles(UserRole.USER)
  async reportReview(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) reviewId: string,
    @Body() payload: ReportReviewDto,
  ) {
    await this.reviewsApplicationService.reportReview(user, reviewId, payload);
    return { success: true, data: { reported: true } };
  }
}
