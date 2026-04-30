import { Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import {
  promotionsActiveCacheRedisKey,
  type PromotionsActiveCachePort,
} from './promotions-active-cache.port';

@Injectable()
export class RedisPromotionsActiveCacheAdapter implements PromotionsActiveCachePort {
  private readonly logger = new Logger(RedisPromotionsActiveCacheAdapter.name);

  constructor(private readonly redis: Redis) {}

  async getSerialized(): Promise<string | null> {
    try {
      return await this.redis.get(promotionsActiveCacheRedisKey);
    } catch (err) {
      this.logger.warn(
        `Redis GET failed for promotions active cache: ${String(err)}`,
      );
      return null;
    }
  }

  async setSerialized(json: string, ttlSeconds: number): Promise<void> {
    try {
      await this.redis.set(
        promotionsActiveCacheRedisKey,
        json,
        'EX',
        ttlSeconds,
      );
    } catch (err) {
      this.logger.warn(
        `Redis SET failed for promotions active cache: ${String(err)}`,
      );
    }
  }

  async invalidate(): Promise<void> {
    try {
      await this.redis.del(promotionsActiveCacheRedisKey);
    } catch (err) {
      this.logger.warn(
        `Redis DEL failed for promotions active cache: ${String(err)}`,
      );
    }
  }
}
