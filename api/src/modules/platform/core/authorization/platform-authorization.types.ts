import { PlatformPermissionCode, UserRole } from '../../../tenant/core/authorization/authorization.types';

export const PLATFORM_AUTHZ_ROLES_KEY = 'platform_authz_roles';
export const PLATFORM_AUTHZ_PERMISSIONS_KEY = 'platform_authz_permissions';

export type PlatformRole = UserRole.ADMIN | UserRole.STAFF;
export type RequiredPlatformPermission = PlatformPermissionCode;
