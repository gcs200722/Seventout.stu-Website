/**
 * Server/client fetch to the Nest API with short retries in development.
 * Avoids ECONNREFUSED spam when Next starts before the API finishes compiling.
 */
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const WEB_APP_URL = process.env.NEXT_PUBLIC_WEB_APP_URL ?? "http://localhost:3000";
const API_FETCH_MODE = process.env.NEXT_PUBLIC_API_FETCH_MODE ?? "proxy";

const RETRY_DELAYS_MS =
  process.env.NODE_ENV === "development" ? [0, 200, 500, 1000, 2000] : [0];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function errnoCode(err: unknown): string | undefined {
  if (!err || typeof err !== "object") return undefined;
  const e = err as { code?: unknown; cause?: unknown };
  if (typeof e.code === "string") return e.code;
  const c = e.cause;
  if (!c || typeof c !== "object") return undefined;
  if ("code" in c && typeof (c as { code: unknown }).code === "string") {
    return (c as { code: string }).code;
  }
  if (c instanceof AggregateError) {
    for (const sub of c.errors) {
      const nested = errnoCode(sub);
      if (nested) return nested;
    }
  }
  return errnoCode(c);
}

function isRetryableConnectionError(err: unknown): boolean {
  const code = errnoCode(err);
  if (code === "ECONNREFUSED" || code === "ECONNRESET" || code === "ETIMEDOUT") {
    return true;
  }
  return err instanceof TypeError && err.message === "fetch failed";
}

/** Absolute URL to the API (path must start with `/` unless it is already absolute). */
export function toApiUrl(pathOrUrl: string): string {
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
    return pathOrUrl;
  }
  const path = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  if (API_FETCH_MODE === "direct") {
    return `${API_URL}${path}`;
  }
  const proxyPath = path.startsWith("/api/proxy/") ? path : `/api/proxy${path}`;
  if (typeof window !== "undefined") {
    return proxyPath;
  }
  return `${WEB_APP_URL}${proxyPath}`;
}

/** Drop-in `fetch` replacement for calls to {@link API_URL}. */
export async function apiFetch(pathOrUrl: string, init?: RequestInit): Promise<Response> {
  const url = toApiUrl(pathOrUrl);
  let lastError: unknown;
  for (let i = 0; i < RETRY_DELAYS_MS.length; i += 1) {
    const delay = RETRY_DELAYS_MS[i];
    if (delay > 0) {
      await sleep(delay);
    }
    try {
      return await fetch(url, init);
    } catch (e) {
      lastError = e;
      const lastAttempt = i === RETRY_DELAYS_MS.length - 1;
      if (lastAttempt || !isRetryableConnectionError(e)) {
        throw e;
      }
    }
  }
  throw lastError;
}
