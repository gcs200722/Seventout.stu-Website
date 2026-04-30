export const REVIEWS_CACHE_PORT = Symbol('REVIEWS_CACHE_PORT');

export type ProductReviewStatsCachePayload = {
  average_rating: number;
  total_reviews: number;
  rating_distribution: Record<string, number>;
};

export interface ReviewsCachePort {
  getProductStats(
    productId: string,
  ): Promise<ProductReviewStatsCachePayload | null>;
  setProductStats(
    productId: string,
    payload: ProductReviewStatsCachePayload,
    ttlSeconds: number,
  ): Promise<void>;
  invalidateProductStats(productId: string): Promise<void>;
}

export function reviewsStatsRedisKey(productId: string): string {
  return `reviews:stats:v1:${productId}`;
}
