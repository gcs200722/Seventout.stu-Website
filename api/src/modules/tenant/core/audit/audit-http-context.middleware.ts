import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { ClsService } from 'nestjs-cls';
import {
  buildAuditHttpSnapshot,
  runWithAuditHttpSnapshot,
} from './audit-request-context';

@Injectable()
export class AuditHttpContextMiddleware implements NestMiddleware {
  constructor(private readonly cls: ClsService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const raw = this.cls.get('tenantId');
    const tenantFromCls =
      typeof raw === 'string' && raw.trim().length > 0 ? raw.trim() : null;
    const snapshot = buildAuditHttpSnapshot(req, tenantFromCls);
    runWithAuditHttpSnapshot(snapshot, () => next());
  }
}
