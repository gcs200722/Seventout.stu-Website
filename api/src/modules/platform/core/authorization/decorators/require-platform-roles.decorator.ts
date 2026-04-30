import { SetMetadata } from '@nestjs/common';
import { PlatformRole, PLATFORM_AUTHZ_ROLES_KEY } from '../platform-authorization.types';

export const RequirePlatformRoles = (...roles: PlatformRole[]) =>
  SetMetadata(PLATFORM_AUTHZ_ROLES_KEY, roles);
