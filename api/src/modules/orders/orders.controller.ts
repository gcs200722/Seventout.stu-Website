import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequirePermissions } from '../authorization/decorators/require-permissions.decorator';
import { RequireRoles } from '../authorization/decorators/require-roles.decorator';
import { AuthorizationGuard } from '../authorization/guards/authorization.guard';
import { PermissionCode, UserRole } from '../authorization/authorization.types';
import { CreateOrderDto } from './dto/create-order.dto';
import { ListOrdersQueryDto } from './dto/list-orders.query.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrdersService } from './orders.service';

@ApiTags('orders')
@Controller('orders')
@UseGuards(JwtAuthGuard, AuthorizationGuard)
@ApiBearerAuth('access-token')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Create order from cart (checkout)' })
  @RequireRoles(UserRole.USER, UserRole.ADMIN)
  @RequirePermissions(PermissionCode.ORDER_CREATE)
  async createOrder(
    @CurrentUser() user: AuthenticatedUser,
    @Body() payload: CreateOrderDto,
    @Headers('x-idempotency-key') idempotencyKey?: string,
  ) {
    const data = await this.ordersService.createOrder(
      user,
      payload,
      idempotencyKey,
    );
    return { success: true, data };
  }

  @Get()
  @ApiOperation({ summary: 'List orders' })
  @RequireRoles(UserRole.USER, UserRole.STAFF, UserRole.ADMIN)
  @RequirePermissions(PermissionCode.ORDER_MANAGE)
  async getOrders(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListOrdersQueryDto,
  ) {
    const result = await this.ordersService.listOrders(user, query);
    return {
      success: true,
      data: result.items,
      pagination: { page: query.page, limit: query.limit, total: result.total },
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order detail' })
  @RequireRoles(UserRole.USER, UserRole.STAFF, UserRole.ADMIN)
  @RequirePermissions(PermissionCode.ORDER_MANAGE)
  async getOrderById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) orderId: string,
  ) {
    const data = await this.ordersService.getOrderById(user, orderId);
    return { success: true, data };
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel order' })
  @RequireRoles(UserRole.USER, UserRole.STAFF, UserRole.ADMIN)
  @RequirePermissions(PermissionCode.ORDER_MANAGE)
  async cancelOrder(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) orderId: string,
  ) {
    await this.ordersService.cancelOrder(user, orderId);
    return { success: true, message: 'Order canceled successfully' };
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update order status' })
  @RequireRoles(UserRole.STAFF, UserRole.ADMIN)
  @RequirePermissions(PermissionCode.ORDER_MANAGE)
  async updateOrderStatus(
    @Param('id', ParseUUIDPipe) orderId: string,
    @Body() payload: UpdateOrderStatusDto,
  ) {
    const data = await this.ordersService.updateStatus(orderId, payload);
    return { success: true, data };
  }
}
