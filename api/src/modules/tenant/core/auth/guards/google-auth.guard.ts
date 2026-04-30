import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { IAuthModuleOptions } from '@nestjs/passport';
import type { ExecutionContext } from '@nestjs/common';
import { AuthService } from '../auth.service';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  constructor(private readonly authService: AuthService) {
    super();
  }

  getAuthenticateOptions(context: ExecutionContext): IAuthModuleOptions {
    const request = context.switchToHttp().getRequest<{ path?: string }>();
    if (request.path?.endsWith('/auth/google')) {
      return {
        scope: ['profile', 'email'],
        session: false,
        state: this.authService.createGoogleState(),
      };
    }

    return {
      session: false,
    };
  }
}
