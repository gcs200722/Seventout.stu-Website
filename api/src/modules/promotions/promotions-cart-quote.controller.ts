import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionCode, UserRole } from '../authorization/authorization.types';
import { RequirePermissions } from '../authorization/decorators/require-permissions.decorator';
import { RequireRoles } from '../authorization/decorators/require-roles.decorator';
import { AuthorizationGuard } from '../authorization/guards/authorization.guard';
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
