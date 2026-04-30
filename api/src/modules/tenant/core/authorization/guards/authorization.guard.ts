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
  PlatformPermissionCode,
  PermissionCode,
  UserRole,
} from '../authorization.types';
import {
  TenantMembershipRole,
  TenantMembershipStatus,
} from '../../memberships/entities/tenant-membership.entity';

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

    const isPlatformPath = request.path.startsWith('/platform/');

    const requiredRoles =
      this.reflector.getAllAndOverride<UserRole[]>(AUTHZ_ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];
    const roleAllowed =
      requiredRoles.length === 0
        ? true
        : isPlatformPath
          ? requiredRoles.includes(user.role)
          : this.hasTenantRole(requiredRoles, user.roleInTenant ?? null);
    if (!roleAllowed) {
      this.deny(
        request,
        user,
        'Your role is not allowed to access this resource',
        {
          reason: 'ROLE_NOT_ALLOWED',
          current_role: isPlatformPath ? user.role : user.roleInTenant,
          required_roles: requiredRoles,
        },
      );
    }

    const requiredPermissions =
      this.reflector.getAllAndOverride<(PermissionCode | PlatformPermissionCode)[]>(
        AUTHZ_PERMISSIONS_KEY,
        [context.getHandler(), context.getClass()],
      ) ?? [];
    if (isPlatformPath) {
      const userPermissions = new Set(user.platformPermissions ?? []);
      const missingPermission = requiredPermissions.find(
        (permission) =>
          !userPermissions.has(permission as PlatformPermissionCode),
      );
      if (missingPermission) {
        this.deny(request, user, `Missing required permission: ${missingPermission}`, {
          reason: 'MISSING_PLATFORM_PERMISSION',
          required_permissions: requiredPermissions,
          missing_permission: missingPermission,
        });
      }
    } else {
      if (
        !user.activeTenantId ||
        user.membershipStatus !== TenantMembershipStatus.ACTIVE ||
        !user.roleInTenant
      ) {
        this.deny(request, user, 'Tenant membership is required for this resource', {
          reason: 'TENANT_MEMBERSHIP_REQUIRED',
        });
      }

      if (
        requiredPermissions.length > 0 &&
        user.roleInTenant === TenantMembershipRole.STAFF
      ) {
        const userPermissions = new Set(user.permissions ?? []);
        const missingPermission = requiredPermissions.find(
          (permission) => !userPermissions.has(permission as PermissionCode),
        );
        if (missingPermission) {
          this.deny(
            request,
            user,
            `Missing required permission: ${missingPermission}`,
            {
              reason: 'MISSING_TENANT_PERMISSION',
              required_permissions: requiredPermissions,
              missing_permission: missingPermission,
            },
          );
        }
      }
    }

    const ownerParam = this.reflector.getAllAndOverride<string>(
      AUTHZ_OWNER_PARAM_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (ownerParam && !isPlatformPath && user.roleInTenant === TenantMembershipRole.STAFF) {
      const ownerId = request.params?.[ownerParam];
      if (!ownerId || ownerId !== user.id) {
        this.deny(request, user, 'You can only access your own resource', {
          reason: 'OWNER_MISMATCH',
          owner_param: ownerParam,
          requested_owner_id: ownerId ?? null,
          current_user_id: user.id,
        });
      }
    }

    return true;
  }

  private hasTenantRole(
    requiredRoles: UserRole[],
    tenantRole: TenantMembershipRole | null,
  ): boolean {
    if (!tenantRole) {
      return false;
    }
    const mappedRole = this.toLegacyTenantRole(tenantRole);
    return requiredRoles.includes(mappedRole);
  }

  private toLegacyTenantRole(role: TenantMembershipRole): UserRole {
    switch (role) {
      case TenantMembershipRole.OWNER:
      case TenantMembershipRole.ADMIN:
        return UserRole.ADMIN;
      case TenantMembershipRole.STAFF:
      default:
        return UserRole.STAFF;
    }
  }

  private deny(
    request: Request,
    user: AuthenticatedUser,
    message: string,
    details: Record<string, unknown>,
  ): never {
    const reason =
      typeof details.reason === 'string' ? details.reason : 'UNKNOWN';
    this.logger.warn(
      `403 denied method=${request.method} path=${request.path} userId=${user.id} role=${user.role} reason=${reason}`,
    );
    throw new ForbiddenException({ message, details });
  }
}
