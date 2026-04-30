import { ForbiddenException } from '@nestjs/common';
import { TenantContextService } from '../context/tenant-context.service';

/**
 * After Passport validates JWT, align CLS tenant with `active_tenant_id` when present.
 * If Host/header already resolved a different tenant, reject (cross-tenant abuse).
 */
export function syncJwtActiveTenantWithCls(
  tenantContext: Pick<TenantContextService, 'getTenantId' | 'setTenantContext'>,
  activeTenantId: string,
): void {
  const fromRequest = tenantContext.getTenantId();
  if (fromRequest && fromRequest !== activeTenantId) {
    throw new ForbiddenException({
      message: 'Token active tenant does not match request tenant context.',
      details: { code: 'TENANT_CONTEXT_MISMATCH' },
    });
  }
  tenantContext.setTenantContext({
    tenantId: activeTenantId,
    tenantSlug: null,
    source: 'jwt',
    tenantSuspended: false,
  });
}
