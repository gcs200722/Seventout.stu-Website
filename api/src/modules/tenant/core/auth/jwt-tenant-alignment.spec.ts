import { ForbiddenException } from '@nestjs/common';
import { syncJwtActiveTenantWithCls } from './jwt-tenant-alignment';
import { TenantContextService } from '../context/tenant-context.service';

describe('syncJwtActiveTenantWithCls', () => {
  const A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

  it('throws when CLS tenant differs from JWT active tenant', () => {
    const tenantContext = {
      getTenantId: jest.fn().mockReturnValue(A),
      setTenantContext: jest.fn(),
    } as unknown as Pick<TenantContextService, 'getTenantId' | 'setTenantContext'>;

    expect(() => syncJwtActiveTenantWithCls(tenantContext, B)).toThrow(
      ForbiddenException,
    );
    expect(tenantContext.setTenantContext).not.toHaveBeenCalled();
  });

  it('sets CLS from JWT when no prior tenant', () => {
    const tenantContext = {
      getTenantId: jest.fn().mockReturnValue(null),
      setTenantContext: jest.fn(),
    } as unknown as Pick<TenantContextService, 'getTenantId' | 'setTenantContext'>;

    syncJwtActiveTenantWithCls(tenantContext, A);

    expect(tenantContext.setTenantContext).toHaveBeenCalledWith({
      tenantId: A,
      tenantSlug: null,
      source: 'jwt',
      tenantSuspended: false,
    });
  });

  it('allows same tenant id from Host and JWT', () => {
    const tenantContext = {
      getTenantId: jest.fn().mockReturnValue(A),
      setTenantContext: jest.fn(),
    } as unknown as Pick<TenantContextService, 'getTenantId' | 'setTenantContext'>;

    syncJwtActiveTenantWithCls(tenantContext, A);

    expect(tenantContext.setTenantContext).toHaveBeenCalled();
  });
});
