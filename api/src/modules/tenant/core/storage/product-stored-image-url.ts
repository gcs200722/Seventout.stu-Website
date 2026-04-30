import type { StoragePort } from './storage.port';

/**
 * Interprets a product thumbnail/image DB value: either an S3 object key
 * (e.g. `products/slug/file.jpg`) or a full S3 HTTPS URL, and returns the object key for signing.
 */
export function extractS3ObjectKeyFromStoredImage(
  value: string,
  bucket?: string,
): string | null {
  if (!value) {
    return null;
  }
  if (!/^https?:\/\//i.test(value)) {
    return value;
  }

  try {
    const url = new URL(value);
    if (!url.hostname.endsWith('amazonaws.com')) {
      return null;
    }

    const rawPath = url.pathname.replace(/^\/+/, '');
    if (!rawPath) {
      return null;
    }

    const host = url.hostname.toLowerCase();
    const isPathStyleHost =
      host === 's3.amazonaws.com' || host.startsWith('s3.');

    let key = rawPath;
    if (bucket && isPathStyleHost) {
      const bucketPrefix = `${bucket}/`;
      if (key === bucket) {
        return null;
      }
      if (key.startsWith(bucketPrefix)) {
        key = key.slice(bucketPrefix.length);
      }
    }

    return key ? decodeURIComponent(key) : null;
  } catch {
    return null;
  }
}

export async function resolveStoredProductImageUrl(
  storage: StoragePort,
  value: string,
  ttlSeconds: number,
  bucket?: string,
): Promise<string> {
  const key = extractS3ObjectKeyFromStoredImage(value, bucket);
  if (!key) {
    return value;
  }
  return storage.getSignedDownloadUrl(key, ttlSeconds);
}
