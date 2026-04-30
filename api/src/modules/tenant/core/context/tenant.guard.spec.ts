import { ExecutionContext, NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TENANT_REQUIRED_KEY } from './tenant-context.constants';
import { TenantContextService } from './tenant-context.service';
import { TenantGuard } from './tenant.guard';

describe('TenantGuard', () => {
  let reflector: jest.Mocked<Reflector>;
  let tenantContext: jest.Mocked<
    Pick<TenantContextService, 'getTenantId' | 'isTenantSuspended'>
  >;
  let guard: TenantGuard;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as jest.Mocked<Reflector>;
    tenantContext = {
      getTenantId: jest.fn(),
      isTenantSuspended: jest.fn(),
    };
    guard = new TenantGuard(reflector, tenantContext as unknown as TenantContextService);
  });

  const buildContext = (path = '/products'): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({
          method: 'GET',
          path,
        }),
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    }) as unknown as ExecutionContext;

  it('allows when tenant is not required', () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    expect(guard.canActivate(buildContext())).toBe(true);
    expect(tenantContext.getTenantId).not.toHaveBeenCalled();
  });

  it('allows when tenant required and tenant id present', () => {
    reflector.getAllAndOverride.mockImplementation((key: unknown) =>
      key === TENANT_REQUIRED_KEY ? true : undefined,
    );
    tenantContext.isTenantSuspended.mockReturnValue(false);
    tenantContext.getTenantId.mockReturnValue('tenant-1');

    expect(guard.canActivate(buildContext())).toBe(true);
  });

  it('throws NotFoundException when tenant required but missing', () => {
    reflector.getAllAndOverride.mockImplementation((key: unknown) =>
      key === TENANT_REQUIRED_KEY ? true : undefined,
    );
    tenantContext.isTenantSuspended.mockReturnValue(false);
    tenantContext.getTenantId.mockReturnValue(null);

    expect(() => guard.canActivate(buildContext())).toThrow(NotFoundException);
    try {
      guard.canActivate(buildContext('/orphan'));
    } catch (e: unknown) {
      expect(e).toBeInstanceOf(NotFoundException);
      expect((e as NotFoundException).getResponse()).toEqual(
        expect.objectContaining({
          message: 'Resource not found.',
          details: { code: 'TENANT_NOT_RESOLVED' },
        }),
      );
    }
  });

  it('throws NotFoundException when tenant is suspended', () => {
    reflector.getAllAndOverride.mockImplementation((key: unknown) =>
      key === TENANT_REQUIRED_KEY ? true : undefined,
    );
    tenantContext.isTenantSuspended.mockReturnValue(true);

    try {
      guard.canActivate(buildContext());
    } catch (e: unknown) {
      expect(e).toBeInstanceOf(NotFoundException);
      expect((e as NotFoundException).getResponse()).toEqual(
        expect.objectContaining({
          message: 'Resource not found.',
          details: { code: 'TENANT_SUSPENDED' },
        }),
      );
    }
  });
});
