import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClsService } from 'nestjs-cls';
import { DataSource } from 'typeorm';
import type { TenantResolutionSource } from './tenant-context.constants';

/**
 * Per-request tenant context (nestjs-cls).
 *
 * - Storefront/public routes: use `requireTenantId()` after `@RequireTenant()` + `TenantGuard`.
 * - Admin / JWT-only routes (until P4): use `requireTenantIdOrDefault()` so DEFAULT_TENANT_* applies when CLS has no tenant.
 */
@Injectable()
export class TenantContextService {
  private defaultTenantIdCache: string | null = null;

  constructor(
    private readonly cls: ClsService,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
  ) {}

  getTenantId(): string | null {
    const id = this.cls.get('tenantId');
    if (typeof id === 'string' && id.trim().length > 0) {
      return id.trim();
    }
    return null;
  }

  getTenantSlug(): string | null {
    const slug = this.cls.get('tenantSlug');
    if (typeof slug === 'string' && slug.trim().length > 0) {
      return slug.trim();
    }
    return null;
  }

  getTenantSource(): TenantResolutionSource | null {
    const s = this.cls.get('tenantSource');
    if (
      s === 'host' ||
      s === 'header' ||
      s === 'jwt' ||
      s === 'default' ||
      s === 'none'
    ) {
      return s;
    }
    return null;
  }

  isTenantSuspended(): boolean {
    return this.cls.get('tenantSuspended') === true;
  }

  setTenantContext(params: {
    tenantId: string | null;
    tenantSlug: string | null;
    source: TenantResolutionSource;
    tenantSuspended?: boolean;
  }): void {
    this.cls.set('tenantId', params.tenantId);
    this.cls.set('tenantSlug', params.tenantSlug);
    this.cls.set('tenantSource', params.source);
    this.cls.set('tenantSuspended', params.tenantSuspended ?? false);
  }

  clearTenantContext(): void {
    this.setTenantContext({
      tenantId: null,
      tenantSlug: null,
      source: 'none',
      tenantSuspended: false,
    });
  }

  /**
   * Storefront/public: must have active tenant from resolver.
   */
  requireTenantId(): string {
    const id = this.getTenantId();
    if (!id) {
      throw new InternalServerErrorException({
        message: 'Tenant context missing.',
        details: { code: 'TENANT_CONTEXT_MISSING' },
      });
    }
    return id;
  }

  /**
   * Admin or legacy paths: prefer CLS; fall back to default tenant env / DB.
   */
  async requireTenantIdOrDefault(): Promise<string> {
    const id = this.getTenantId();
    if (id) {
      return id;
    }
    return this.resolveDefaultTenantId();
  }

  private async resolveDefaultTenantId(): Promise<string> {
    if (this.defaultTenantIdCache) {
      return this.defaultTenantIdCache;
    }
    const configured = this.configService.get<string>('DEFAULT_TENANT_ID');
    if (configured?.trim()) {
      this.defaultTenantIdCache = configured.trim();
      return this.defaultTenantIdCache;
    }
    const fallbackSlug = this.configService.get<string>(
      'DEFAULT_TENANT_SLUG',
      'default',
    );
    const rows: unknown = await this.dataSource.query(
      `SELECT id
       FROM tenants
       WHERE LOWER(slug) = LOWER($1)
       LIMIT 1`,
      [fallbackSlug],
    );
    let resolved: string | null = null;
    if (Array.isArray(rows) && rows.length > 0) {
      const firstRow: unknown = rows[0];
      if (
        firstRow &&
        typeof firstRow === 'object' &&
        'id' in firstRow &&
        typeof firstRow.id === 'string'
      ) {
        resolved = firstRow.id;
      }
    }
    if (!resolved) {
      throw new BadRequestException('Default tenant is not configured.');
    }
    this.defaultTenantIdCache = resolved;
    return resolved;
  }
}
