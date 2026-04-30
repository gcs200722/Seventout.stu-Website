import { SetMetadata } from '@nestjs/common';

/** Metadata: route requires resolved active tenant (storefront/public). */
export const TENANT_REQUIRED_KEY = 'tenantRequired';

export const RequireTenant = () => SetMetadata(TENANT_REQUIRED_KEY, true);

export type TenantResolutionSource =
  | 'host'
  | 'header'
  | 'jwt'
  | 'default'
  | 'none';
