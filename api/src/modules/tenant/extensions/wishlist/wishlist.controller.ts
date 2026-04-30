import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedUser } from '../../core/auth/auth.types';
import { CurrentUser } from '../../core/auth/current-user.decorator';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { RequirePermissions } from '../../core/authorization/decorators/require-permissions.decorator';
import { RequireRoles } from '../../core/authorization/decorators/require-roles.decorator';
import { AuthorizationGuard } from '../../core/authorization/guards/authorization.guard';
import {
  PermissionCode,
  UserRole,
} from '../../core/authorization/authorization.types';
import { AddWishlistItemDto } from './dto/add-wishlist-item.dto';
import { ListWishlistQueryDto } from './dto/list-wishlist.query.dto';
import { WishlistApplicationService } from './wishlist.application.service';

@ApiTags('wishlist')
@Controller('wishlist')
@UseGuards(JwtAuthGuard, AuthorizationGuard)
@ApiBearerAuth('access-token')
export class WishlistController {
  constructor(
    private readonly wishlistApplicationService: WishlistApplicationService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Add product to wishlist (idempotent)' })
  @RequireRoles(UserRole.USER, UserRole.ADMIN)
  @RequirePermissions(PermissionCode.WISHLIST_MANAGE)
  async add(
    @CurrentUser() user: AuthenticatedUser,
    @Body() payload: AddWishlistItemDto,
  ) {
    const { created } = await this.wishlistApplicationService.addItem(
      user.id,
      payload,
    );
    return {
      success: true,
      message: created
        ? 'Product added to wishlist'
        : 'Product already in wishlist',
    };
  }

  @Get('check/:productId')
  @ApiOperation({ summary: 'Check if product is in wishlist' })
  @RequireRoles(UserRole.USER, UserRole.ADMIN)
  @RequirePermissions(PermissionCode.WISHLIST_MANAGE)
  async check(
    @CurrentUser() user: AuthenticatedUser,
    @Param('productId', ParseUUIDPipe) productId: string,
  ) {
    const isFavorite = await this.wishlistApplicationService.isFavorite(
      user.id,
      productId,
    );
    return { success: true, data: { is_favorite: isFavorite } };
  }

  @Get()
  @ApiOperation({ summary: 'List wishlist items' })
  @RequireRoles(UserRole.USER, UserRole.ADMIN)
  @RequirePermissions(PermissionCode.WISHLIST_MANAGE)
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListWishlistQueryDto,
  ) {
    const result = await this.wishlistApplicationService.listItems(
      user.id,
      query,
    );
    return {
      success: true,
      data: { items: result.items },
      pagination: {
        page: query.page,
        limit: query.limit,
        total: result.total,
      },
    };
  }

  @Delete(':productId')
  @ApiOperation({ summary: 'Remove product from wishlist (idempotent)' })
  @RequireRoles(UserRole.USER, UserRole.ADMIN)
  @RequirePermissions(PermissionCode.WISHLIST_MANAGE)
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('productId', ParseUUIDPipe) productId: string,
  ) {
    await this.wishlistApplicationService.removeItem(user.id, productId);
    return {
      success: true,
      message: 'Product removed from wishlist',
    };
  }
}
