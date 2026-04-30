import { Global, Module } from '@nestjs/common';
import { TenantsModule } from '../../../platform/tenants/tenants.module';
import { TenantContextService } from './tenant-context.service';
import { TenantResolverMiddleware } from './tenant-resolver.middleware';
import { TrustedTenantHeaderPolicy } from './trusted-tenant-header.policy';
import { TenantGuard } from './tenant.guard';

@Global()
@Module({
  imports: [TenantsModule],
  providers: [
    TenantContextService,
    TrustedTenantHeaderPolicy,
    TenantResolverMiddleware,
    TenantGuard,
  ],
  exports: [TenantContextService, TenantResolverMiddleware, TenantGuard],
})
export class TenantContextModule {}
