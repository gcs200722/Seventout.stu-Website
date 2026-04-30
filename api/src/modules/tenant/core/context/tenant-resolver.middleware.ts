import { Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NextFunction, Request, Response } from 'express';
import { TenantStatus } from '../../../platform/tenants/entities/tenant.entity';
import { TenantsService } from '../../../platform/tenants/tenants.service';
import { TenantContextService } from './tenant-context.service';
import type { TenantResolutionSource } from './tenant-context.constants';
import { TrustedTenantHeaderPolicy } from './trusted-tenant-header.policy';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Resolves tenant from Host / X-Forwarded-Host (storefront), then optional trusted headers
 * ({@link TrustedTenantHeaderPolicy}).
 * Runs after {@link ClsMiddleware}; must run before {@link AuditHttpContextMiddleware}
 * so audit snapshots can read tenant from CLS.
 *
 * See {@link TenantGuard} + {@link RequireTenant} for routes that require an active tenant.
 */
@Injectable()
export class TenantResolverMiddleware implements NestMiddleware {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly tenantsService: TenantsService,
    private readonly configService: ConfigService,
    private readonly trustedTenantHeaders: TrustedTenantHeaderPolicy,
  ) {}

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    await this.resolve(req);
    next();
  }

  private async resolve(req: Request): Promise<void> {
    const rootDomain = this.configService.get<string>(
      'PLATFORM_ROOT_DOMAIN',
      'localtest.me',
    );

    const forwarded = req.get('x-forwarded-host');
    const rawHost = forwarded ?? req.get('host') ?? '';
    const host = rawHost.split(',')[0]?.trim() ?? '';

    let tenantId: string | null = null;
    let tenantSlug: string | null = null;
    let source: TenantResolutionSource = 'none';
    let suspended = false;

    const slugFromHost = this.parseSlugFromHost(host, rootDomain);
    if (slugFromHost) {
      try {
        const normalized = this.tenantsService.normalizeSlug(slugFromHost);
        tenantSlug = normalized;
        const entity = await this.tenantsService.findBySlug(normalized);
        if (entity) {
          if (entity.status === TenantStatus.ACTIVE) {
            tenantId = entity.id;
            source = 'host';
          } else {
            suspended = true;
          }
        }
      } catch {
        /* invalid slug from host — skip */
      }
    }

    if (!tenantId && !suspended && this.trustedTenantHeaders.allows(req)) {
      const resolved = await this.tryResolveFromTrustedHeaders(req);
      if (resolved?.suspended) {
        suspended = true;
      } else if (resolved) {
        tenantId = resolved.tenantId;
        tenantSlug = resolved.tenantSlug;
        source = 'header';
      }
    }

    this.tenantContext.setTenantContext({
      tenantId,
      tenantSlug,
      source: tenantId ? source : suspended ? 'none' : source,
      tenantSuspended: suspended && !tenantId,
    });
  }

  private parseSlugFromHost(hostHeader: string, rootDomain: string): string | null {
    if (!hostHeader) {
      return null;
    }
    const normalizedHost = hostHeader.split(':')[0].trim().toLowerCase();
    const root = rootDomain.trim().toLowerCase();
    if (!normalizedHost.endsWith(`.${root}`)) {
      return null;
    }
    const slug = normalizedHost.slice(0, -`.${root}`.length);
    if (!slug || slug === 'www' || slug === 'admin' || slug === 'api') {
      return null;
    }
    return slug;
  }

  private async tryResolveFromTrustedHeaders(
    req: Request,
  ): Promise<
    | { tenantId: string; tenantSlug: string | null; suspended?: false }
    | { suspended: true; tenantSlug?: string | null }
    | null
  > {
    const idHeader = req.get('x-tenant-id')?.trim();
    if (idHeader && UUID_RE.test(idHeader)) {
      const entity = await this.tenantsService.findById(idHeader);
      if (!entity) {
        return null;
      }
      if (entity.status !== TenantStatus.ACTIVE) {
        return { suspended: true, tenantSlug: entity.slug };
      }
      return {
        tenantId: entity.id,
        tenantSlug: entity.slug,
      };
    }

    const slugHeader = req.get('x-tenant-slug')?.trim();
    if (!slugHeader) {
      return null;
    }
    try {
      const normalized = this.tenantsService.normalizeSlug(slugHeader);
      const entity = await this.tenantsService.findBySlug(normalized);
      if (!entity) {
        return null;
      }
      if (entity.status !== TenantStatus.ACTIVE) {
        return { suspended: true, tenantSlug: entity.slug };
      }
      return {
        tenantId: entity.id,
        tenantSlug: entity.slug,
      };
    } catch {
      return null;
    }
  }
}
