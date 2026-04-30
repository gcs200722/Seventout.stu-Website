import type { TenantResolutionSource } from './tenant-context.constants';

declare module 'nestjs-cls' {
  interface ClsStore {
    tenantId?: string | null;
    tenantSlug?: string | null;
    tenantSource?: TenantResolutionSource | null;
    /** True when slug matched a suspended tenant (storefront should 404). */
    tenantSuspended?: boolean;
  }
}
