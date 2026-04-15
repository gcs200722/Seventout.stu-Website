import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { AuthenticatedUser } from '../../auth/auth.types';
import {
  AUTHZ_OWNER_PARAM_KEY,
  AUTHZ_PERMISSIONS_KEY,
  AUTHZ_ROLES_KEY,
  PermissionCode,
  UserRole,
} from '../authorization.types';

@Injectable()
export class AuthorizationGuard implements CanActivate {
  private readonly logger = new Logger(AuthorizationGuard.name);

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as AuthenticatedUser | undefined;

    if (!user) {
      return false;
    }

    if (user.role === UserRole.ADMIN) {
      return true;
    }

    const requiredRoles =
      this.reflector.getAllAndOverride<UserRole[]>(AUTHZ_ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];
    if (requiredRoles.length > 0 && !requiredRoles.includes(user.role)) {
      this.deny(request, user, `role_not_allowed:${user.role}`);
    }

    const requiredPermissions =
      this.reflector.getAllAndOverride<PermissionCode[]>(
        AUTHZ_PERMISSIONS_KEY,
        [context.getHandler(), context.getClass()],
      ) ?? [];
    if (requiredPermissions.length > 0 && user.role === UserRole.STAFF) {
      const userPermissions = new Set(user.permissions ?? []);
      const missingPermission = requiredPermissions.find(
        (permission) => !userPermissions.has(permission),
      );
      if (missingPermission) {
        this.deny(request, user, `missing_permission:${missingPermission}`);
      }
    }

    const ownerParam = this.reflector.getAllAndOverride<string>(
      AUTHZ_OWNER_PARAM_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (ownerParam && user.role === UserRole.USER) {
      const ownerId = request.params?.[ownerParam];
      if (!ownerId || ownerId !== user.id) {
        this.deny(request, user, `owner_mismatch:${ownerParam}`);
      }
    }

    return true;
  }

  private deny(
    request: Request,
    user: AuthenticatedUser,
    reason: string,
  ): never {
    this.logger.warn(
      `403 denied method=${request.method} path=${request.path} userId=${user.id} role=${user.role} reason=${reason}`,
    );
    throw new ForbiddenException(
      'You do not have permission to access this resource',
    );
  }
}
