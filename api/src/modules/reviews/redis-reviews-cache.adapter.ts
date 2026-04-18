import { Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import {
  type ProductReviewStatsCachePayload,
  type ReviewsCachePort,
  reviewsStatsRedisKey,
} from './reviews-cache.port';

@Injectable()
export class RedisReviewsCacheAdapter implements ReviewsCachePort {
  private readonly logger = new Logger(RedisReviewsCacheAdapter.name);

  constructor(private readonly redis: Redis) {}

  async getProductStats(
    productId: string,
  ): Promise<ProductReviewStatsCachePayload | null> {
    try {
      const raw = await this.redis.get(reviewsStatsRedisKey(productId));
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw) as ProductReviewStatsCachePayload;
      return parsed;
    } catch (err) {
      this.logger.warn(
        `Redis GET failed for review stats productId=${productId}: ${String(err)}`,
      );
      return null;
    }
  }

  async setProductStats(
    productId: string,
    payload: ProductReviewStatsCachePayload,
    ttlSeconds: number,
  ): Promise<void> {
    try {
      await this.redis.set(
        reviewsStatsRedisKey(productId),
        JSON.stringify(payload),
        'EX',
        ttlSeconds,
      );
    } catch (err) {
      this.logger.warn(
        `Redis SET failed for review stats productId=${productId}: ${String(err)}`,
      );
    }
  }

  async invalidateProductStats(productId: string): Promise<void> {
    try {
      await this.redis.del(reviewsStatsRedisKey(productId));
    } catch (err) {
      this.logger.warn(
        `Redis DEL failed for review stats productId=${productId}: ${String(err)}`,
      );
    }
  }
}
