import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { RequirePermissions } from '../../core/authorization/decorators/require-permissions.decorator';
import { RequireRoles } from '../../core/authorization/decorators/require-roles.decorator';
import { AuthorizationGuard } from '../../core/authorization/guards/authorization.guard';
import {
  PermissionCode,
  UserRole,
} from '../../core/authorization/authorization.types';
import { ListAdminReviewsQueryDto } from './dto/list-admin-reviews.query.dto';
import { ModerateReviewDto } from './dto/moderate-review.dto';
import { ReviewsApplicationService } from './reviews.application.service';

@ApiTags('reviews-admin')
@Controller('admin/reviews')
@UseGuards(JwtAuthGuard, AuthorizationGuard)
@ApiBearerAuth('access-token')
export class ReviewsAdminController {
  constructor(
    private readonly reviewsApplicationService: ReviewsApplicationService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List reviews for moderation' })
  @RequireRoles(UserRole.STAFF, UserRole.ADMIN)
  @RequirePermissions(PermissionCode.REVIEW_READ)
  async listReviews(@Query() query: ListAdminReviewsQueryDto) {
    const { items, total } =
      await this.reviewsApplicationService.adminListReviews(query);
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

  @Patch(':id')
  @ApiOperation({ summary: 'Moderate review status' })
  @RequireRoles(UserRole.STAFF, UserRole.ADMIN)
  @RequirePermissions(PermissionCode.REVIEW_MODERATE)
  async moderateReview(
    @Param('id', ParseUUIDPipe) reviewId: string,
    @Body() payload: ModerateReviewDto,
  ) {
    const data = await this.reviewsApplicationService.moderateReview(
      reviewId,
      payload,
    );
    return { success: true, data };
  }
}
