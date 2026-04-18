import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  EntityManager,
  IsNull,
  QueryFailedError,
  Repository,
} from 'typeorm';
import type { AuthenticatedUser } from '../auth/auth.types';
import { OrderItemEntity } from '../orders/entities/order-item.entity';
import { OrderEntity } from '../orders/entities/order.entity';
import { OrderStatus, PaymentStatus } from '../orders/orders.types';
import { ProductEntity } from '../products/product.entity';
import { CreateReviewDto } from './dto/create-review.dto';
import { ListAdminReviewsQueryDto } from './dto/list-admin-reviews.query.dto';
import {
  ListProductReviewsQueryDto,
  ProductReviewSort,
} from './dto/list-product-reviews.query.dto';
import { ModerateReviewDto } from './dto/moderate-review.dto';
import { ReportReviewDto } from './dto/report-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import {
  type RatingDistribution,
  ProductReviewStatsEntity,
} from './entities/product-review-stats.entity';
import { ReviewEventOutboxEntity } from './entities/review-event-outbox.entity';
import { ReviewInteractionEntity } from './entities/review-interaction.entity';
import { ReviewEntity } from './entities/review.entity';
import { ReviewEventDispatcherService } from './events/review-event-dispatcher.service';
import {
  REVIEWS_CACHE_PORT,
  type ProductReviewStatsCachePayload,
  type ReviewsCachePort,
} from './reviews-cache.port';
import {
  ReviewEventType,
  ReviewInteractionType,
  ReviewStatus,
} from './reviews.types';

const EMPTY_DIST: RatingDistribution = {
  '1': 0,
  '2': 0,
  '3': 0,
  '4': 0,
  '5': 0,
};

@Injectable()
export class ReviewsApplicationService {
  constructor(
    @InjectRepository(ReviewEntity)
    private readonly reviewRepository: Repository<ReviewEntity>,
    @InjectRepository(ProductReviewStatsEntity)
    private readonly statsRepository: Repository<ProductReviewStatsEntity>,
    @InjectRepository(ReviewEventOutboxEntity)
    private readonly outboxRepository: Repository<ReviewEventOutboxEntity>,
    @InjectRepository(OrderEntity)
    private readonly orderRepository: Repository<OrderEntity>,
    @InjectRepository(OrderItemEntity)
    private readonly orderItemRepository: Repository<OrderItemEntity>,
    @InjectRepository(ProductEntity)
    private readonly productRepository: Repository<ProductEntity>,
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
    private readonly eventDispatcher: ReviewEventDispatcherService,
    @Inject(REVIEWS_CACHE_PORT)
    private readonly reviewsCache: ReviewsCachePort,
  ) {}

  async processOutbox(): Promise<void> {
    const events = await this.outboxRepository.find({
      where: { processedAt: IsNull() },
      order: { createdAt: 'ASC' },
      take: 50,
    });
    for (const event of events) {
      try {
        await this.eventDispatcher.dispatch(event);
        event.processedAt = new Date();
        event.failedAt = null;
        event.errorMessage = null;
      } catch (error) {
        event.retryCount += 1;
        event.failedAt = new Date();
        event.errorMessage =
          error instanceof Error
            ? error.message
            : 'Unknown event dispatch failure';
      }
      await this.outboxRepository.save(event);
    }
  }

  async createReview(
    user: AuthenticatedUser,
    dto: CreateReviewDto,
  ): Promise<unknown> {
    const maxMedia = this.configService.getOrThrow<number>(
      'REVIEWS_MAX_MEDIA_URLS',
    );
    const mediaUrls = this.normalizeMediaUrls(dto.media_urls, maxMedia);
    const defaultStatus = this.getDefaultReviewStatus();

    const product = await this.productRepository.findOne({
      where: { id: dto.product_id },
    });
    if (!product || product.deletedAt) {
      throw new NotFoundException({
        message: 'Product not found',
        details: { code: 'PRODUCT_NOT_FOUND' },
      });
    }

    const duplicate = await this.reviewRepository.findOne({
      where: {
        userId: user.id,
        productId: dto.product_id,
        orderId: dto.order_id,
      },
      withDeleted: true,
    });
    if (duplicate) {
      throw new BadRequestException({
        message:
          'You already submitted a review for this product on this order',
        details: { code: 'REVIEW_ALREADY_EXISTS' },
      });
    }

    await this.assertOrderEligibleForReview(
      user.id,
      dto.order_id,
      dto.product_id,
    );

    const saved = await this.dataSource.transaction(async (manager) => {
      const reviewRepo = manager.getRepository(ReviewEntity);
      const outboxRepo = manager.getRepository(ReviewEventOutboxEntity);

      const review = reviewRepo.create({
        userId: user.id,
        productId: dto.product_id,
        orderId: dto.order_id,
        rating: dto.rating,
        content: dto.content.trim(),
        mediaUrls,
        status: defaultStatus,
        helpfulCount: 0,
        isVerifiedPurchase: true,
      });
      const created = await reviewRepo.save(review);

      await this.recomputeProductStats(manager, dto.product_id);

      if (defaultStatus === ReviewStatus.APPROVED) {
        await outboxRepo.save(
          outboxRepo.create({
            reviewId: created.id,
            eventType: ReviewEventType.REVIEW_APPROVED,
            payload: {
              review_id: created.id,
              owner_user_id: user.id,
              product_id: created.productId,
            },
          }),
        );
      }

      return created;
    });

    await this.reviewsCache.invalidateProductStats(dto.product_id);

    return this.toReviewResponse(saved);
  }

  async updateReview(
    user: AuthenticatedUser,
    reviewId: string,
    dto: UpdateReviewDto,
  ): Promise<unknown> {
    const review = await this.reviewRepository.findOne({
      where: { id: reviewId },
    });
    if (!review) {
      throw new NotFoundException({
        message: 'Review not found',
        details: { code: 'REVIEW_NOT_FOUND' },
      });
    }
    if (review.userId !== user.id) {
      throw new ForbiddenException({
        message: 'You can only edit your own review',
        details: { code: 'REVIEW_NOT_OWNER' },
      });
    }
    if (review.status === ReviewStatus.REJECTED) {
      throw new BadRequestException({
        message: 'Rejected reviews cannot be edited',
        details: { code: 'REVIEW_NOT_EDITABLE' },
      });
    }

    if (
      dto.rating === undefined &&
      dto.content === undefined &&
      dto.media_urls === undefined
    ) {
      throw new BadRequestException({
        message: 'No changes provided',
        details: { code: 'REVIEW_UPDATE_EMPTY' },
      });
    }

    const windowDays = this.configService.getOrThrow<number>(
      'REVIEWS_EDIT_WINDOW_DAYS',
    );
    if (windowDays > 0) {
      const deadline = new Date(review.createdAt);
      deadline.setDate(deadline.getDate() + windowDays);
      if (new Date() > deadline) {
        throw new BadRequestException({
          message: 'Review edit window has expired',
          details: { code: 'REVIEW_EDIT_WINDOW_EXPIRED' },
        });
      }
    }

    const maxMedia = this.configService.getOrThrow<number>(
      'REVIEWS_MAX_MEDIA_URLS',
    );
    const prevApproved = review.status === ReviewStatus.APPROVED;

    if (dto.rating !== undefined) {
      review.rating = dto.rating;
    }
    if (dto.content !== undefined) {
      review.content = dto.content.trim();
    }
    if (dto.media_urls !== undefined) {
      review.mediaUrls = this.normalizeMediaUrls(dto.media_urls, maxMedia);
    }

    const saved = await this.dataSource.transaction(async (manager) => {
      const r = await manager.getRepository(ReviewEntity).save(review);
      if (prevApproved || r.status === ReviewStatus.APPROVED) {
        await this.recomputeProductStats(manager, r.productId);
      }
      return r;
    });

    await this.reviewsCache.invalidateProductStats(review.productId);

    return this.toReviewResponse(saved);
  }

  async deleteReview(user: AuthenticatedUser, reviewId: string): Promise<void> {
    const review = await this.reviewRepository.findOne({
      where: { id: reviewId },
    });
    if (!review) {
      throw new NotFoundException({
        message: 'Review not found',
        details: { code: 'REVIEW_NOT_FOUND' },
      });
    }
    if (review.userId !== user.id) {
      throw new ForbiddenException({
        message: 'You can only delete your own review',
        details: { code: 'REVIEW_NOT_OWNER' },
      });
    }

    const productId = review.productId;
    const wasApproved = review.status === ReviewStatus.APPROVED;

    await this.dataSource.transaction(async (manager) => {
      await manager.getRepository(ReviewEntity).softRemove(review);
      if (wasApproved) {
        await this.recomputeProductStats(manager, productId);
      }
    });

    await this.reviewsCache.invalidateProductStats(productId);
  }

  async listProductReviews(
    productId: string,
    query: ListProductReviewsQueryDto,
  ): Promise<{ items: unknown[]; total: number }> {
    const qb = this.reviewRepository
      .createQueryBuilder('r')
      .where('r.product_id = :productId', { productId })
      .andWhere('r.status = :status', { status: ReviewStatus.APPROVED })
      .andWhere('r.deleted_at IS NULL');

    const total = await qb.clone().getCount();

    if (query.sort === ProductReviewSort.rating) {
      qb.orderBy('r.rating', 'DESC').addOrderBy('r.created_at', 'DESC');
    } else if (query.sort === ProductReviewSort.helpful) {
      qb.orderBy('r.helpful_count', 'DESC').addOrderBy('r.created_at', 'DESC');
    } else {
      qb.orderBy('r.created_at', 'DESC');
    }

    qb.skip((query.page - 1) * query.limit).take(query.limit);

    const rows = await qb.getMany();
    return {
      items: rows.map((r) => this.toReviewResponse(r)),
      total,
    };
  }

  async getProductReviewStats(
    productId: string,
  ): Promise<ProductReviewStatsCachePayload> {
    const ttl = this.configService.getOrThrow<number>(
      'REVIEWS_CACHE_TTL_SECONDS',
    );
    const cached = await this.reviewsCache.getProductStats(productId);
    if (cached) {
      return cached;
    }

    let stats = await this.statsRepository.findOne({ where: { productId } });
    if (!stats) {
      await this.dataSource.transaction(async (manager) => {
        await this.recomputeProductStats(manager, productId);
      });
      stats = await this.statsRepository.findOne({ where: { productId } });
    }

    const payload: ProductReviewStatsCachePayload = stats
      ? {
          average_rating: Number(stats.averageRating),
          total_reviews: stats.totalReviews,
          rating_distribution: { ...EMPTY_DIST, ...stats.ratingDistribution },
        }
      : {
          average_rating: 0,
          total_reviews: 0,
          rating_distribution: { ...EMPTY_DIST },
        };

    await this.reviewsCache.setProductStats(productId, payload, ttl);
    return payload;
  }

  async likeReview(
    user: AuthenticatedUser,
    reviewId: string,
  ): Promise<{ liked: boolean }> {
    const review = await this.reviewRepository.findOne({
      where: { id: reviewId },
    });
    if (!review) {
      throw new NotFoundException({
        message: 'Review not found',
        details: { code: 'REVIEW_NOT_FOUND' },
      });
    }
    if (review.status !== ReviewStatus.APPROVED) {
      throw new BadRequestException({
        message: 'You can only like published reviews',
        details: { code: 'REVIEW_NOT_LIKABLE' },
      });
    }

    try {
      await this.dataSource.transaction(async (manager) => {
        const interactionRepo = manager.getRepository(ReviewInteractionEntity);
        const reviewRepo = manager.getRepository(ReviewEntity);
        await interactionRepo.save(
          interactionRepo.create({
            reviewId,
            userId: user.id,
            type: ReviewInteractionType.LIKE,
            reason: null,
          }),
        );
        await reviewRepo.increment({ id: reviewId }, 'helpfulCount', 1);
      });
      await this.reviewsCache.invalidateProductStats(review.productId);
      return { liked: true };
    } catch (error) {
      if (this.isPgUniqueViolation(error, 'uq_review_interactions_like')) {
        return { liked: false };
      }
      throw error;
    }
  }

  async reportReview(
    user: AuthenticatedUser,
    reviewId: string,
    dto: ReportReviewDto,
  ): Promise<void> {
    const review = await this.reviewRepository.findOne({
      where: { id: reviewId },
    });
    if (!review) {
      throw new NotFoundException({
        message: 'Review not found',
        details: { code: 'REVIEW_NOT_FOUND' },
      });
    }
    if (review.status !== ReviewStatus.APPROVED) {
      throw new BadRequestException({
        message: 'You can only report published reviews',
        details: { code: 'REVIEW_NOT_REPORTABLE' },
      });
    }
    if (review.userId === user.id) {
      throw new BadRequestException({
        message: 'You cannot report your own review',
        details: { code: 'REVIEW_REPORT_SELF' },
      });
    }

    try {
      await this.dataSource.transaction(async (manager) => {
        const interactionRepo = manager.getRepository(ReviewInteractionEntity);
        const outboxRepo = manager.getRepository(ReviewEventOutboxEntity);

        await interactionRepo.save(
          interactionRepo.create({
            reviewId,
            userId: user.id,
            type: ReviewInteractionType.REPORT,
            reason: dto.reason,
          }),
        );

        await outboxRepo.save(
          outboxRepo.create({
            reviewId,
            eventType: ReviewEventType.REVIEW_REPORTED,
            payload: {
              review_id: reviewId,
              reporter_user_id: user.id,
              reason: dto.reason,
            },
          }),
        );
      });
    } catch (error) {
      if (this.isPgUniqueViolation(error, 'uq_review_interactions_report')) {
        throw new BadRequestException({
          message: 'You already reported this review',
          details: { code: 'REVIEW_ALREADY_REPORTED' },
        });
      }
      throw error;
    }
  }

  async adminListReviews(
    query: ListAdminReviewsQueryDto,
  ): Promise<{ items: unknown[]; total: number }> {
    const qb = this.reviewRepository
      .createQueryBuilder('r')
      .where('r.deleted_at IS NULL');

    if (query.status) {
      qb.andWhere('r.status = :status', { status: query.status });
    }
    if (query.product_id) {
      qb.andWhere('r.product_id = :productId', { productId: query.product_id });
    }

    const total = await qb.clone().getCount();
    qb.orderBy('r.created_at', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit);

    const rows = await qb.getMany();
    return { items: rows.map((r) => this.toReviewResponse(r)), total };
  }

  async moderateReview(
    reviewId: string,
    dto: ModerateReviewDto,
  ): Promise<unknown> {
    const review = await this.reviewRepository.findOne({
      where: { id: reviewId },
    });
    if (!review) {
      throw new NotFoundException({
        message: 'Review not found',
        details: { code: 'REVIEW_NOT_FOUND' },
      });
    }

    const prev = review.status;
    const next = dto.status;
    if (prev === next) {
      return this.toReviewResponse(review);
    }

    review.status = next;

    const saved = await this.dataSource.transaction(async (manager) => {
      const outboxRepo = manager.getRepository(ReviewEventOutboxEntity);
      const r = await manager.getRepository(ReviewEntity).save(review);
      await this.recomputeProductStats(manager, r.productId);

      if (prev !== ReviewStatus.APPROVED && next === ReviewStatus.APPROVED) {
        await outboxRepo.save(
          outboxRepo.create({
            reviewId: r.id,
            eventType: ReviewEventType.REVIEW_APPROVED,
            payload: {
              review_id: r.id,
              owner_user_id: r.userId,
              product_id: r.productId,
            },
          }),
        );
      }

      return r;
    });

    await this.reviewsCache.invalidateProductStats(review.productId);

    return this.toReviewResponse(saved);
  }

  private getDefaultReviewStatus(): ReviewStatus {
    const raw = this.configService.getOrThrow<'PENDING' | 'APPROVED'>(
      'REVIEWS_DEFAULT_STATUS',
    );
    return raw === 'PENDING' ? ReviewStatus.PENDING : ReviewStatus.APPROVED;
  }

  private normalizeMediaUrls(
    urls: string[] | undefined,
    max: number,
  ): string[] {
    const raw = (urls ?? [])
      .map((u) => String(u).trim())
      .filter((u) => u.length > 0);
    const unique = [...new Set(raw)];
    return unique.slice(0, max);
  }

  private async assertOrderEligibleForReview(
    userId: string,
    orderId: string,
    productId: string,
  ): Promise<void> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
    });
    if (!order || order.userId !== userId) {
      throw new BadRequestException({
        message: 'You can only review purchased products',
        details: { code: 'REVIEW_NOT_ALLOWED' },
      });
    }
    if (order.status !== OrderStatus.COMPLETED) {
      throw new BadRequestException({
        message: 'Order must be completed before you can leave a review',
        details: { code: 'REVIEW_ORDER_NOT_COMPLETED' },
      });
    }
    if (order.paymentStatus !== PaymentStatus.PAID) {
      throw new BadRequestException({
        message: 'Order must be paid before you can leave a review',
        details: { code: 'REVIEW_ORDER_NOT_PAID' },
      });
    }

    const item = await this.orderItemRepository.findOne({
      where: { orderId, productId },
    });
    if (!item) {
      throw new BadRequestException({
        message: 'This product is not part of the selected order',
        details: { code: 'REVIEW_PRODUCT_NOT_IN_ORDER' },
      });
    }
  }

  private async recomputeProductStats(
    manager: EntityManager,
    productId: string,
  ): Promise<void> {
    const reviewRepo = manager.getRepository(ReviewEntity);
    const statsRepo = manager.getRepository(ProductReviewStatsEntity);

    const distRows = await reviewRepo
      .createQueryBuilder('r')
      .select('r.rating', 'rating')
      .addSelect('COUNT(*)', 'cnt')
      .where('r.product_id = :productId', { productId })
      .andWhere('r.status = :status', { status: ReviewStatus.APPROVED })
      .andWhere('r.deleted_at IS NULL')
      .groupBy('r.rating')
      .getRawMany<{ rating: string; cnt: string }>();

    const distribution: RatingDistribution = {
      ...EMPTY_DIST,
    };
    let total = 0;
    let sum = 0;
    for (const row of distRows) {
      const rating = String(row.rating) as keyof typeof distribution;
      const c = Number(row.cnt);
      if (rating in distribution) {
        distribution[rating] = c;
        total += c;
        sum += Number(row.rating) * c;
      }
    }

    if (total === 0) {
      await statsRepo.delete({ productId });
      return;
    }

    const average = Math.round((sum / total) * 100) / 100;

    let entity = await statsRepo.findOne({ where: { productId } });
    if (!entity) {
      entity = statsRepo.create({
        productId,
        averageRating: average.toFixed(2),
        totalReviews: total,
        ratingDistribution: distribution,
      });
    } else {
      entity.averageRating = average.toFixed(2);
      entity.totalReviews = total;
      entity.ratingDistribution = distribution;
    }
    await statsRepo.save(entity);
  }

  private toReviewResponse(review: ReviewEntity): Record<string, unknown> {
    return {
      id: review.id,
      product_id: review.productId,
      user_id: review.userId,
      order_id: review.orderId,
      rating: review.rating,
      content: review.content,
      media_urls: review.mediaUrls ?? [],
      status: review.status,
      is_verified_purchase: review.isVerifiedPurchase,
      helpful_count: review.helpfulCount,
      created_at: review.createdAt.toISOString(),
      updated_at: review.updatedAt.toISOString(),
    };
  }

  private isPgUniqueViolation(error: unknown, constraint: string): boolean {
    if (!(error instanceof QueryFailedError)) {
      return false;
    }
    const driverError = error.driverError as
      | { code?: string; constraint?: string }
      | undefined;
    return (
      driverError?.code === '23505' && driverError?.constraint === constraint
    );
  }
}
