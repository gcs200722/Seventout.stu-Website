import { Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import {
  CmsPublishedCachePort,
  cmsPublishedCacheRedisKey,
} from './cms-published-cache.port';

@Injectable()
export class RedisCmsPublishedCacheAdapter implements CmsPublishedCachePort {
  private readonly logger = new Logger(RedisCmsPublishedCacheAdapter.name);

  constructor(private readonly redis: Redis) {}

  async getSerialized(pageKey: string): Promise<string | null> {
    try {
      return await this.redis.get(cmsPublishedCacheRedisKey(pageKey));
    } catch (err) {
      this.logger.warn(
        `Redis GET failed for CMS cache key=${pageKey}: ${String(err)}`,
      );
      return null;
    }
  }

  async setSerialized(
    pageKey: string,
    json: string,
    ttlSeconds: number,
  ): Promise<void> {
    try {
      await this.redis.set(
        cmsPublishedCacheRedisKey(pageKey),
        json,
        'EX',
        ttlSeconds,
      );
    } catch (err) {
      this.logger.warn(
        `Redis SET failed for CMS cache key=${pageKey}: ${String(err)}`,
      );
    }
  }

  async invalidate(pageKey: string): Promise<void> {
    try {
      await this.redis.del(cmsPublishedCacheRedisKey(pageKey));
    } catch (err) {
      this.logger.warn(
        `Redis DEL failed for CMS cache key=${pageKey}: ${String(err)}`,
      );
    }
  }
}
