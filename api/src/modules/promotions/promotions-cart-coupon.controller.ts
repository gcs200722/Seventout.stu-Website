import { Body, Controller, Delete, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionCode, UserRole } from '../authorization/authorization.types';
import { RequirePermissions } from '../authorization/decorators/require-permissions.decorator';
import { RequireRoles } from '../authorization/decorators/require-roles.decorator';
import { AuthorizationGuard } from '../authorization/guards/authorization.guard';
import { ApplyCartCouponDto } from './dto/apply-cart-coupon.dto';
import { PromotionsApplicationService } from './promotions.application.service';

@ApiTags('cart')
@Controller('cart')
@UseGuards(JwtAuthGuard, AuthorizationGuard)
@ApiBearerAuth('access-token')
export class PromotionsCartCouponController {
  constructor(
    private readonly promotionsApplication: PromotionsApplicationService,
  ) {}

  @Post('coupon')
  @ApiOperation({ summary: 'Apply coupon code to the current cart' })
  @RequireRoles(UserRole.USER, UserRole.ADMIN)
  @RequirePermissions(PermissionCode.CART_MANAGE)
  async applyCoupon(
    @CurrentUser() user: AuthenticatedUser,
    @Body() payload: ApplyCartCouponDto,
  ) {
    const data = await this.promotionsApplication.attachCouponToCart(
      user.id,
      payload.code,
    );
    return { success: true, data };
  }

  @Delete('coupon')
  @ApiOperation({ summary: 'Remove coupon from the current cart' })
  @RequireRoles(UserRole.USER, UserRole.ADMIN)
  @RequirePermissions(PermissionCode.CART_MANAGE)
  async removeCoupon(@CurrentUser() user: AuthenticatedUser) {
    await this.promotionsApplication.removeCouponFromCart(user.id);
    return { success: true, message: 'Coupon removed from cart' };
  }
}
