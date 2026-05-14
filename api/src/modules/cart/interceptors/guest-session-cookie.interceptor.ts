import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import type { Response } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { GUEST_SESSION_COOKIE_NAME } from '../guest-session.constants';

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

@Injectable()
export class GuestSessionCookieInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest<{
      guestSessionNew?: boolean;
      guestSessionId?: string;
    }>();
    const res = http.getResponse<Response>();
    return next.handle().pipe(
      tap(() => {
        if (req.guestSessionId) {
          res.setHeader('x-guest-session-id', req.guestSessionId);
        }
        if (req.guestSessionNew && req.guestSessionId) {
          const secure =
            process.env.NODE_ENV === 'production' ||
            process.env.GUEST_SESSION_COOKIE_SECURE === '1' ||
            process.env.GUEST_SESSION_COOKIE_SECURE === 'true';
          res.cookie(GUEST_SESSION_COOKIE_NAME, req.guestSessionId, {
            httpOnly: true,
            sameSite: 'lax',
            secure,
            path: '/',
            maxAge: ONE_YEAR_MS,
          });
        }
      }),
    );
  }
}
