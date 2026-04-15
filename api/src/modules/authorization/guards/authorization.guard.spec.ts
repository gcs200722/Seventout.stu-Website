import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthenticatedUser } from '../../auth/auth.types';
import { PermissionCode, UserRole } from '../authorization.types';
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
  ): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({
          method: 'GET',
          path: '/users/123',
          params,
          user,
        }),
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    }) as unknown as ExecutionContext;

  it('allows admin regardless of metadata', () => {
    const allowed = guard.canActivate(
      buildContext({
        id: 'admin-id',
        email: 'admin@example.com',
        role: UserRole.ADMIN,
        permissions: [],
      }),
    );

    expect(allowed).toBe(true);
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
      }),
    );

    expect(allowed).toBe(true);
  });

  it('blocks user when owner param does not match', () => {
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
            role: UserRole.USER,
            permissions: [],
          },
          { id: 'user-other' },
        ),
      ),
    ).toThrow(ForbiddenException);
  });
});
