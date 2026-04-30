import { Module } from '@nestjs/common';
import { PlatformAuthorizationGuard } from './guards/platform-authorization.guard';

@Module({
  providers: [PlatformAuthorizationGuard],
  exports: [PlatformAuthorizationGuard],
})
export class PlatformAuthorizationModule {}
