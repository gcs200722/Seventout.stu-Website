import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { IAuthModuleOptions } from '@nestjs/passport';
import type { ExecutionContext } from '@nestjs/common';
import { PlatformAuthService } from '../platform-auth.service';

@Injectable()
export class PlatformGoogleAuthGuard extends AuthGuard('platform-google') {
  constructor(private readonly platformAuthService: PlatformAuthService) {
    super();
  }

  getAuthenticateOptions(context: ExecutionContext): IAuthModuleOptions {
    const request = context.switchToHttp().getRequest<{ path?: string }>();
    if (request.path?.endsWith('/platform/auth/google')) {
      return {
        scope: ['profile', 'email'],
        session: false,
        state: this.platformAuthService.createGoogleState(),
      };
    }
    return { session: false };
  }
}
