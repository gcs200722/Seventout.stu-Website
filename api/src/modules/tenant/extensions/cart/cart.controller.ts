import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
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
import { RequireTenant } from '../../core/context/tenant-context.constants';
import { TenantGuard } from '../../core/context/tenant.guard';
import { CartService } from './cart.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

@ApiTags('cart')
@Controller('cart')
@RequireTenant()
@UseGuards(JwtAuthGuard, AuthorizationGuard, TenantGuard)
@ApiBearerAuth('access-token')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @ApiOperation({ summary: 'Get current cart' })
  @RequireRoles(UserRole.USER, UserRole.ADMIN)
  @RequirePermissions(PermissionCode.CART_READ)
  async getCurrentCart(@CurrentUser() user: AuthenticatedUser) {
    const data = await this.cartService.getCurrentCart(user.id);
    return { success: true, data };
  }

  @Post('items')
  @ApiOperation({ summary: 'Add product to cart' })
  @RequireRoles(UserRole.USER, UserRole.ADMIN)
  @RequirePermissions(PermissionCode.CART_MANAGE)
  async addItem(
    @CurrentUser() user: AuthenticatedUser,
    @Body() payload: AddCartItemDto,
  ) {
    await this.cartService.addItem(user.id, payload);
    return { success: true, message: 'Cart item added successfully' };
  }

  @Patch('items/:itemId')
  @ApiOperation({ summary: 'Update quantity of cart item' })
  @RequireRoles(UserRole.USER, UserRole.ADMIN)
  @RequirePermissions(PermissionCode.CART_MANAGE)
  async updateItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() payload: UpdateCartItemDto,
  ) {
    await this.cartService.updateItem(user.id, itemId, payload);
    return { success: true, message: 'Cart item updated successfully' };
  }

  @Delete('items/:itemId')
  @ApiOperation({ summary: 'Delete cart item' })
  @RequireRoles(UserRole.USER, UserRole.ADMIN)
  @RequirePermissions(PermissionCode.CART_MANAGE)
  async deleteItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('itemId', ParseUUIDPipe) itemId: string,
  ) {
    await this.cartService.removeItem(user.id, itemId);
    return { success: true, message: 'Cart item removed successfully' };
  }

  @Delete('clear')
  @ApiOperation({ summary: 'Clear current cart' })
  @RequireRoles(UserRole.USER, UserRole.ADMIN)
  @RequirePermissions(PermissionCode.CART_MANAGE)
  async clear(@CurrentUser() user: AuthenticatedUser) {
    await this.cartService.clearCart(user.id);
    return { success: true, message: 'Cart cleared successfully' };
  }

  @Post('validate')
  @ApiOperation({ summary: 'Validate current cart' })
  @RequireRoles(UserRole.USER, UserRole.ADMIN)
  @RequirePermissions(PermissionCode.CART_MANAGE)
  async validate(@CurrentUser() user: AuthenticatedUser) {
    const data = await this.cartService.validateCart(user.id);
    return { success: true, data };
  }
}
