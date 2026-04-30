import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import Redis from 'ioredis';
import { AuthorizationModule } from '../../core/authorization/authorization.module';
import { NotificationModule } from '../../core/notification/notification.module';
import { OrderItemEntity } from '../orders/entities/order-item.entity';
import { OrderEntity } from '../orders/entities/order.entity';
import { ProductEntity } from '../products/product.entity';
import { ProductReviewStatsEntity } from './entities/product-review-stats.entity';
import { ReviewEventOutboxEntity } from './entities/review-event-outbox.entity';
import { ReviewInteractionEntity } from './entities/review-interaction.entity';
import { ReviewEntity } from './entities/review.entity';
import { ReviewEventDispatcherService } from './events/review-event-dispatcher.service';
import { ReviewOutboxProcessor } from './review-outbox.processor';
import { RedisReviewsCacheAdapter } from './redis-reviews-cache.adapter';
import { REVIEWS_CACHE_PORT } from './reviews-cache.port';
import { ReviewsAdminController } from './reviews-admin.controller';
import { ReviewsApplicationService } from './reviews.application.service';
import { ReviewsPublicController } from './reviews-public.controller';
import { ReviewsController } from './reviews.controller';

export const REVIEWS_REDIS_CLIENT = Symbol('REVIEWS_REDIS_CLIENT');

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      ReviewEntity,
      ReviewInteractionEntity,
      ProductReviewStatsEntity,
      ReviewEventOutboxEntity,
      OrderEntity,
      OrderItemEntity,
      ProductEntity,
    ]),
    AuthorizationModule,
    NotificationModule,
  ],
  controllers: [
    ReviewsPublicController,
    ReviewsController,
    ReviewsAdminController,
  ],
  providers: [
    ReviewsApplicationService,
    ReviewEventDispatcherService,
    ReviewOutboxProcessor,
    {
      provide: REVIEWS_REDIS_CLIENT,
      useFactory: (configService: ConfigService) =>
        new Redis({
          host: configService.getOrThrow<string>('REDIS_HOST'),
          port: configService.getOrThrow<number>('REDIS_PORT'),
          password: configService.get<string>('REDIS_PASSWORD') || undefined,
          maxRetriesPerRequest: 2,
        }),
      inject: [ConfigService],
    },
    {
      provide: REVIEWS_CACHE_PORT,
      useFactory: (redis: Redis) => new RedisReviewsCacheAdapter(redis),
      inject: [REVIEWS_REDIS_CLIENT],
    },
  ],
  exports: [ReviewsApplicationService],
})
export class ReviewsModule {}
