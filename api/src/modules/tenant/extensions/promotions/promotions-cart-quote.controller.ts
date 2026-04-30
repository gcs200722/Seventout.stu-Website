import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedUser } from '../../core/auth/auth.types';
import { CurrentUser } from '../../core/auth/current-user.decorator';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import {
  PermissionCode,
  UserRole,
} from '../../core/authorization/authorization.types';
import { RequirePermissions } from '../../core/authorization/decorators/require-permissions.decorator';
import { RequireRoles } from '../../core/authorization/decorators/require-roles.decorator';
import { AuthorizationGuard } from '../../core/authorization/guards/authorization.guard';
import { PromotionsApplicationService } from './promotions.application.service';

@ApiTags('promotions')
@Controller('promotions')
@UseGuards(JwtAuthGuard, AuthorizationGuard)
@ApiBearerAuth('access-token')
export class PromotionsCartQuoteController {
  constructor(
    private readonly promotionsApplication: PromotionsApplicationService,
  ) {}

  @Get('cart-quote')
  @ApiOperation({
    summary: 'Preview promotion pricing for the current active cart',
  })
  @RequireRoles(UserRole.USER, UserRole.ADMIN)
  @RequirePermissions(PermissionCode.CART_READ)
  async quote(@CurrentUser() user: AuthenticatedUser) {
    const data = await this.promotionsApplication.getQuoteForActiveCart(
      user.id,
    );
    return { success: true, data };
  }
}
