import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { ensureGuestSessionIdForGuard } from '../guest-session.constants';

@Injectable()
export class GuestSessionGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<
      Request & {
        guestSessionId?: string;
        guestSessionNew?: boolean;
      }
    >();
    const { sessionId, isNew } = ensureGuestSessionIdForGuard(
      req.headers.cookie,
      req.headers['x-guest-session-id'],
    );
    req.guestSessionId = sessionId;
    req.guestSessionNew = isNew;
    return true;
  }
}
