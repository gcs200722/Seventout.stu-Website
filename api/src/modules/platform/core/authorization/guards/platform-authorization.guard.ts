import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { PlatformPermissionCode, UserRole } from '../../../../tenant/core/authorization/authorization.types';
import { PlatformAuthenticatedUser } from '../../auth/platform-auth.types';
import {
  PLATFORM_AUTHZ_PERMISSIONS_KEY,
  PLATFORM_AUTHZ_ROLES_KEY,
  PlatformRole,
} from '../platform-authorization.types';

@Injectable()
export class PlatformAuthorizationGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as PlatformAuthenticatedUser | undefined;
    if (!user || user.tokenScope !== 'platform') {
      return false;
    }

    const requiredRoles =
      this.reflector.getAllAndOverride<PlatformRole[]>(PLATFORM_AUTHZ_ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];
    if (requiredRoles.length > 0 && !requiredRoles.includes(user.role as UserRole.ADMIN | UserRole.STAFF)) {
      throw new ForbiddenException('Platform role is not allowed');
    }

    const requiredPermissions =
      this.reflector.getAllAndOverride<PlatformPermissionCode[]>(
        PLATFORM_AUTHZ_PERMISSIONS_KEY,
        [context.getHandler(), context.getClass()],
      ) ?? [];
    if (requiredPermissions.length > 0) {
      const granted = new Set(user.platformPermissions ?? []);
      const missing = requiredPermissions.find((permission) => !granted.has(permission));
      if (missing) {
        throw new ForbiddenException(`Missing platform permission: ${missing}`);
      }
    }
    return true;
  }
}
