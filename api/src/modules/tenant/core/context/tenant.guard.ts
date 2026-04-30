import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TenantContextService } from './tenant-context.service';
import { TENANT_REQUIRED_KEY } from './tenant-context.constants';

/**
 * When {@link RequireTenant} is set on handler or controller, ensures an active tenant
 * was resolved into CLS. Missing / suspended tenants → 404 with neutral message.
 *
 * Do not register globally — exclude `/`, `/auth/*`, health, and admin-only routes per P3.
 */
@Injectable()
export class TenantGuard implements CanActivate {
  private readonly logger = new Logger(TenantGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly tenantContext: TenantContextService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const required =
      this.reflector.getAllAndOverride<boolean>(TENANT_REQUIRED_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? false;

    if (!required) {
      return true;
    }

    const req = context.switchToHttp().getRequest<{ method?: string; path?: string }>();
    const path = req.path ?? '';

    if (this.tenantContext.isTenantSuspended()) {
      this.logger.warn(
        `tenant_guard suspended path=${path} method=${req.method ?? ''}`,
      );
      throw new NotFoundException({
        message: 'Resource not found.',
        details: { code: 'TENANT_SUSPENDED' },
      });
    }

    const tenantId = this.tenantContext.getTenantId();
    if (!tenantId) {
      this.logger.warn(
        `tenant_guard unresolved path=${path} method=${req.method ?? ''}`,
      );
      throw new NotFoundException({
        message: 'Resource not found.',
        details: { code: 'TENANT_NOT_RESOLVED' },
      });
    }

    return true;
  }
}
