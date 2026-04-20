import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import {
  buildAuditHttpSnapshot,
  runWithAuditHttpSnapshot,
} from './audit-request-context';

@Injectable()
export class AuditHttpContextMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const snapshot = buildAuditHttpSnapshot(req);
    runWithAuditHttpSnapshot(snapshot, () => next());
  }
}
