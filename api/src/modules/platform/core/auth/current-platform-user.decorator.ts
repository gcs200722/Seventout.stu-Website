import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { PlatformAuthenticatedUser } from './platform-auth.types';

export const CurrentPlatformUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): PlatformAuthenticatedUser => {
    const request = context
      .switchToHttp()
      .getRequest<{ user: PlatformAuthenticatedUser }>();
    return request.user;
  },
);
