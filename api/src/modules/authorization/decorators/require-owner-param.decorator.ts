import { SetMetadata } from '@nestjs/common';
import { AUTHZ_OWNER_PARAM_KEY } from '../authorization.types';

export const RequireOwnerParam = (paramName: string) =>
  SetMetadata(AUTHZ_OWNER_PARAM_KEY, paramName);
