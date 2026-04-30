export const CMS_PUBLISHED_CACHE_PORT = Symbol('CMS_PUBLISHED_CACHE_PORT');

export interface CmsPublishedCachePort {
  getSerialized(pageKey: string): Promise<string | null>;
  setSerialized(
    pageKey: string,
    json: string,
    ttlSeconds: number,
  ): Promise<void>;
  invalidate(pageKey: string): Promise<void>;
}

export function cmsPublishedCacheRedisKey(pageKey: string): string {
  return `cms:page:published:${pageKey}`;
}
