export const PROMOTIONS_ACTIVE_CACHE_PORT = Symbol(
  'PROMOTIONS_ACTIVE_CACHE_PORT',
);

export const promotionsActiveCacheRedisKey = 'promotions:active:v1';

export interface PromotionsActiveCachePort {
  getSerialized(): Promise<string | null>;
  setSerialized(json: string, ttlSeconds: number): Promise<void>;
  invalidate(): Promise<void>;
}
