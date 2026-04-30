import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthenticatedUser } from '../../auth/auth.types';
import { PermissionCode, UserRole } from '../authorization.types';
import {
  TenantMembershipRole,
  TenantMembershipStatus,
} from '../../memberships/entities/tenant-membership.entity';
import { AuthorizationGuard } from './authorization.guard';

describe('AuthorizationGuard', () => {
  let reflector: jest.Mocked<Reflector>;
  let guard: AuthorizationGuard;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as jest.Mocked<Reflector>;
    guard = new AuthorizationGuard(reflector);
  });

  const buildContext = (
    user: AuthenticatedUser,
    params: Record<string, string> = {},
    path = '/users/123',
  ): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({
          method: 'GET',
          path,
          params,
          user,
        }),
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    }) as unknown as ExecutionContext;

  it('blocks tenant route without active membership', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    expect(() =>
      guard.canActivate(
        buildContext({
          id: 'admin-id',
          email: 'admin@example.com',
          role: UserRole.ADMIN,
          permissions: [],
        }),
      ),
    ).toThrow(ForbiddenException);
  });

  it('blocks staff when missing required permission', () => {
    reflector.getAllAndOverride
      .mockReturnValueOnce([UserRole.ADMIN, UserRole.STAFF])
      .mockReturnValueOnce([PermissionCode.ORDER_MANAGE])
      .mockReturnValueOnce(undefined);

    expect(() =>
      guard.canActivate(
        buildContext({
          id: 'staff-id',
          email: 'staff@example.com',
          role: UserRole.STAFF,
          permissions: [PermissionCode.PRODUCT_MANAGE],
          activeTenantId: 'tenant-1',
          roleInTenant: TenantMembershipRole.STAFF,
          membershipStatus: TenantMembershipStatus.ACTIVE,
        }),
      ),
    ).toThrow(ForbiddenException);
  });

  it('allows staff with required permission', () => {
    reflector.getAllAndOverride
      .mockReturnValueOnce([UserRole.ADMIN, UserRole.STAFF])
      .mockReturnValueOnce([PermissionCode.ORDER_MANAGE])
      .mockReturnValueOnce(undefined);

    const allowed = guard.canActivate(
      buildContext({
        id: 'staff-id',
        email: 'staff@example.com',
        role: UserRole.STAFF,
        permissions: [PermissionCode.ORDER_MANAGE],
        activeTenantId: 'tenant-1',
        roleInTenant: TenantMembershipRole.STAFF,
        membershipStatus: TenantMembershipStatus.ACTIVE,
      }),
    );

    expect(allowed).toBe(true);
  });

  it('blocks staff when users list requires USER_READ and permission missing', () => {
    reflector.getAllAndOverride
      .mockReturnValueOnce([UserRole.ADMIN, UserRole.STAFF])
      .mockReturnValueOnce([PermissionCode.USER_READ])
      .mockReturnValueOnce(undefined);

    expect(() =>
      guard.canActivate(
        buildContext({
          id: 'staff-id',
          email: 'staff@example.com',
          role: UserRole.STAFF,
          permissions: [],
          activeTenantId: 'tenant-1',
          roleInTenant: TenantMembershipRole.STAFF,
          membershipStatus: TenantMembershipStatus.ACTIVE,
        }),
      ),
    ).toThrow(ForbiddenException);
  });

  it('allows staff when users list requires USER_READ and permission exists', () => {
    reflector.getAllAndOverride
      .mockReturnValueOnce([UserRole.ADMIN, UserRole.STAFF])
      .mockReturnValueOnce([PermissionCode.USER_READ])
      .mockReturnValueOnce(undefined);

    const allowed = guard.canActivate(
      buildContext({
        id: 'staff-id',
        email: 'staff@example.com',
        role: UserRole.STAFF,
        permissions: [PermissionCode.USER_READ],
        activeTenantId: 'tenant-1',
        roleInTenant: TenantMembershipRole.STAFF,
        membershipStatus: TenantMembershipStatus.ACTIVE,
      }),
    );

    expect(allowed).toBe(true);
  });

  it('blocks staff when owner param does not match', () => {
    reflector.getAllAndOverride
      .mockReturnValueOnce([UserRole.ADMIN, UserRole.USER])
      .mockReturnValueOnce(undefined)
      .mockReturnValueOnce('id');

    expect(() =>
      guard.canActivate(
        buildContext(
          {
            id: 'user-abc',
            email: 'user@example.com',
            role: UserRole.STAFF,
            permissions: [],
            activeTenantId: 'tenant-1',
            roleInTenant: TenantMembershipRole.STAFF,
            membershipStatus: TenantMembershipStatus.ACTIVE,
          },
          { id: 'user-other' },
        ),
      ),
    ).toThrow(ForbiddenException);
  });

  it('allows platform route with platform admin role metadata', () => {
    reflector.getAllAndOverride
      .mockReturnValueOnce([UserRole.ADMIN])
      .mockReturnValueOnce(undefined)
      .mockReturnValueOnce(undefined);
    const allowed = guard.canActivate(
      buildContext(
        {
          id: 'admin-id',
          email: 'admin@example.com',
          role: UserRole.ADMIN,
          permissions: [],
          platformPermissions: [],
        },
        {},
        '/platform/tenants',
      ),
    );
    expect(allowed).toBe(true);
  });
});
