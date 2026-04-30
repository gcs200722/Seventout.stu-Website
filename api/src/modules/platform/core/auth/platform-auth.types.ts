import { UserRole } from '../../../tenant/core/authorization/authorization.types';
import { PlatformPermissionCode } from '../../../tenant/core/authorization/authorization.types';

export interface PlatformAccessTokenPayload {
  sub: string;
  user_id: string;
  email: string;
  role: UserRole;
  platform_permissions: PlatformPermissionCode[];
  token_scope: 'platform';
}

export interface PlatformRefreshTokenPayload {
  sub: string;
  tokenId: string;
  type: 'refresh';
  token_scope: 'platform';
}

export interface PlatformAuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  platformPermissions: PlatformPermissionCode[];
  tokenScope: 'platform';
}
