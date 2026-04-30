import { SetMetadata } from '@nestjs/common';
import { PlatformPermissionCode } from '../../../../tenant/core/authorization/authorization.types';
import { PLATFORM_AUTHZ_PERMISSIONS_KEY } from '../platform-authorization.types';

export const RequirePlatformPermissions = (
  ...permissions: PlatformPermissionCode[]
) => SetMetadata(PLATFORM_AUTHZ_PERMISSIONS_KEY, permissions);
