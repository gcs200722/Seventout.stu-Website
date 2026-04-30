import { SetMetadata } from '@nestjs/common';
import { AUTHZ_ROLES_KEY, UserRole } from '../authorization.types';

export const RequireRoles = (...roles: UserRole[]) =>
  SetMetadata(AUTHZ_ROLES_KEY, roles);
