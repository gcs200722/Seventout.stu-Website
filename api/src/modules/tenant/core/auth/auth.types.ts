import { UserRole } from '../authorization/authorization.types';
import {
  PlatformPermissionCode,
  PermissionCode,
} from '../authorization/authorization.types';
import {
  TenantMembershipRole,
  TenantMembershipStatus,
} from '../memberships/entities/tenant-membership.entity';

export interface AccessTokenPayload {
  sub: string;
  user_id: string;
  email: string;
  role: UserRole;
  permissions: PermissionCode[];
  platform_permissions: PlatformPermissionCode[];
  active_tenant_id: string | null;
  role_in_tenant: TenantMembershipRole | null;
  membership_status: TenantMembershipStatus | null;
}

export interface RefreshTokenPayload {
  sub: string;
  tokenId: string;
  type: 'refresh';
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  permissions: PermissionCode[];
  platformPermissions?: PlatformPermissionCode[];
  activeTenantId?: string | null;
  roleInTenant?: TenantMembershipRole | null;
  membershipStatus?: TenantMembershipStatus | null;
}
