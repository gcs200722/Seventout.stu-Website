import { AsyncLocalStorage } from 'node:async_hooks';
import type { Request } from 'express';

/** Captured once per HTTP request for audit metadata (IP, UA, route). */
export type AuditHttpSnapshot = {
  tenantId: string | null;
  clientIp: string | null;
  userAgent: string | null;
  httpMethod: string;
  httpPath: string;
};

const auditHttpAls = new AsyncLocalStorage<AuditHttpSnapshot>();

export function getAuditHttpSnapshot(): AuditHttpSnapshot | undefined {
  return auditHttpAls.getStore();
}

export function runWithAuditHttpSnapshot<T>(
  snapshot: AuditHttpSnapshot,
  fn: () => T,
): T {
  return auditHttpAls.run(snapshot, fn);
}

export function extractClientIp(req: Request): string | null {
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.trim().length > 0) {
    const first = xff.split(',')[0]?.trim();
    return first && first.length > 0 ? first : null;
  }
  if (Array.isArray(xff) && xff[0]) {
    const first = String(xff[0]).split(',')[0]?.trim();
    return first && first.length > 0 ? first : null;
  }
  if (typeof req.ip === 'string' && req.ip.length > 0) {
    return req.ip;
  }
  const remote = req.socket?.remoteAddress;
  if (remote && remote.length > 0) {
    return remote;
  }
  return null;
}

export function extractUserAgent(req: Request): string | null {
  const ua = req.get('user-agent');
  return ua && ua.trim().length > 0 ? ua.trim() : null;
}

/**
 * @param tenantFromCls — tenant resolved by {@link TenantResolverMiddleware} (preferred over raw header).
 */
export function buildAuditHttpSnapshot(
  req: Request,
  tenantFromCls?: string | null,
): AuditHttpSnapshot {
  const path = req.originalUrl?.split('?')[0] ?? req.url ?? '';
  const tenantIdHeader = req.get('x-tenant-id');
  const fromHeader =
    tenantIdHeader && tenantIdHeader.trim().length > 0
      ? tenantIdHeader.trim()
      : null;
  const tenantId =
    tenantFromCls && tenantFromCls.trim().length > 0
      ? tenantFromCls.trim()
      : fromHeader;
  return {
    tenantId,
    clientIp: extractClientIp(req),
    userAgent: extractUserAgent(req),
    httpMethod: req.method,
    httpPath: path,
  };
}
