import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

export type TrustedTenantHeaderPolicyParams = {
  nodeEnv: string;
  tenantDevSecretEnv?: string;
  tenantTrustedHeaderIpsEnv?: string;
  headerXTenantDevSecret?: string;
  clientIp: string;
};

/**
 * When true, {@link TenantResolverMiddleware} may resolve tenant from
 * `x-tenant-id` / `x-tenant-slug` (after validating tenant exists and is active).
 *
 * - Non-production: always allowed.
 * - Production: requires `TENANT_DEV_HEADER_SECRET` and matching `x-tenant-dev-secret`.
 * - If `TENANT_TRUSTED_HEADER_IPS` is set, client IP (Express `req.ip` / forwarded-for) must be listed.
 */
export function allowsTrustedTenantHeaders(
  p: TrustedTenantHeaderPolicyParams,
): boolean {
  if (p.nodeEnv !== 'production') {
    return true;
  }
  const secret = p.tenantDevSecretEnv?.trim();
  if (!secret) {
    return false;
  }
  if (p.headerXTenantDevSecret !== secret) {
    return false;
  }
  const raw = p.tenantTrustedHeaderIpsEnv?.trim();
  if (!raw) {
    return true;
  }
  const allowed = raw.split(',').map((s) => s.trim()).filter(Boolean);
  return allowed.includes(p.clientIp);
}

/** Client IP for header trust checks (use after `trust proxy` when behind Cloudflare/LB). */
export function getTrustedPolicyClientIp(req: Request): string {
  const expressReq = req as Request & { ip?: string };
  if (typeof expressReq.ip === 'string' && expressReq.ip.length > 0) {
    return expressReq.ip;
  }
  const forwarded = req.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() ?? '';
  }
  return req.socket?.remoteAddress ?? '';
}

@Injectable()
export class TrustedTenantHeaderPolicy {
  constructor(private readonly configService: ConfigService) {}

  allows(req: Request): boolean {
    return allowsTrustedTenantHeaders({
      nodeEnv: this.configService.get<string>('NODE_ENV', 'development'),
      tenantDevSecretEnv: this.configService.get<string>('TENANT_DEV_HEADER_SECRET'),
      tenantTrustedHeaderIpsEnv: this.configService.get<string>(
        'TENANT_TRUSTED_HEADER_IPS',
      ),
      headerXTenantDevSecret: req.get('x-tenant-dev-secret') ?? undefined,
      clientIp: getTrustedPolicyClientIp(req),
    });
  }
}
