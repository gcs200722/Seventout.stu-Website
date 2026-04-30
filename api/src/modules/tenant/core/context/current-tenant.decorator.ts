import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { ClsServiceManager } from 'nestjs-cls';
import type { TenantResolutionSource } from './tenant-context.constants';

export type CurrentTenantPayload = {
  id: string | null;
  slug: string | null;
  source: TenantResolutionSource | null;
};

/**
 * Tenant id from CLS (after {@link TenantResolverMiddleware}).
 * Prefer injecting {@link TenantContextService} in services.
 */
export const CurrentTenantId = createParamDecorator(
  (_data: unknown, _ctx: ExecutionContext): string | null => {
    const cls = ClsServiceManager.getClsService();
    const id = cls.get('tenantId');
    return typeof id === 'string' && id.trim().length > 0 ? id.trim() : null;
  },
);

export const CurrentTenant = createParamDecorator(
  (_data: unknown, _ctx: ExecutionContext): CurrentTenantPayload => {
    const cls = ClsServiceManager.getClsService();
    const id = cls.get('tenantId');
    const slug = cls.get('tenantSlug');
    const source = cls.get('tenantSource');
    return {
      id:
        typeof id === 'string' && id.trim().length > 0 ? id.trim() : null,
      slug:
        typeof slug === 'string' && slug.trim().length > 0
          ? slug.trim()
          : null,
      source:
        source === 'host' ||
        source === 'header' ||
        source === 'jwt' ||
        source === 'default' ||
        source === 'none'
          ? source
          : null,
    };
  },
);
