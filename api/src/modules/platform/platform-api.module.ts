import { Module } from '@nestjs/common';
import { PlatformAuthModule } from './core/auth/platform-auth.module';
import { PlatformAuthorizationModule } from './core/authorization/platform-authorization.module';
import { TenantsModule } from './tenants/tenants.module';

@Module({
  imports: [PlatformAuthModule, PlatformAuthorizationModule, TenantsModule],
  exports: [PlatformAuthModule, PlatformAuthorizationModule, TenantsModule],
})
export class PlatformApiModule {}
