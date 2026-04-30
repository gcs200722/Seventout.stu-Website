import { SetMetadata } from '@nestjs/common';
import { AUTHZ_PERMISSIONS_KEY, PermissionCode } from '../authorization.types';

export const RequirePermissions = (...permissions: PermissionCode[]) =>
  SetMetadata(AUTHZ_PERMISSIONS_KEY, permissions);
