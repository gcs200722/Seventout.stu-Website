import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { syncJwtActiveTenantWithCls } from '../jwt-tenant-alignment';
import { TenantContextService } from '../../context/tenant-context.service';
import { AuthenticatedUser } from '../auth.types';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly tenantContext: TenantContextService) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const activated = (await super.canActivate(context)) as boolean;
    if (!activated) {
      return false;
    }

    const request = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
    const user = request.user;
    if (user?.activeTenantId) {
      syncJwtActiveTenantWithCls(this.tenantContext, user.activeTenantId);
    }
    return true;
  }
}
