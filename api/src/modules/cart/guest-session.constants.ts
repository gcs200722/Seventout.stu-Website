import { randomUUID } from 'crypto';

export const GUEST_SESSION_COOKIE_NAME = 'guest_session';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuidLike(value: string): boolean {
  return UUID_RE.test(value.trim());
}

export function parseCookieHeader(
  cookieHeader: string | undefined,
): Record<string, string> {
  const out: Record<string, string> = {};
  if (!cookieHeader) {
    return out;
  }
  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) {
      continue;
    }
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    try {
      out[k] = decodeURIComponent(v);
    } catch {
      out[k] = v;
    }
  }
  return out;
}

export function readGuestSessionIdFromRequest(
  cookieHeader: string | undefined,
  headerValue: string | string[] | undefined,
): string | null {
  const cookies = parseCookieHeader(cookieHeader);
  const fromCookie = cookies[GUEST_SESSION_COOKIE_NAME]?.trim();
  const rawHeader = Array.isArray(headerValue) ? headerValue[0] : headerValue;
  const fromHeader = rawHeader?.trim();
  const candidate = fromCookie || fromHeader || '';
  if (candidate && isUuidLike(candidate)) {
    return candidate;
  }
  return null;
}

export function ensureGuestSessionIdForGuard(
  cookieHeader: string | undefined,
  headerValue: string | string[] | undefined,
): { sessionId: string; isNew: boolean } {
  const existing = readGuestSessionIdFromRequest(cookieHeader, headerValue);
  if (existing) {
    return { sessionId: existing, isNew: false };
  }
  return { sessionId: randomUUID(), isNew: true };
}
