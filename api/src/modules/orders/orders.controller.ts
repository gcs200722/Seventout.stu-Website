import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequirePermissions } from '../authorization/decorators/require-permissions.decorator';
import { RequireRoles } from '../authorization/decorators/require-roles.decorator';
import { AuthorizationGuard } from '../authorization/guards/authorization.guard';
import { PermissionCode, UserRole } from '../authorization/authorization.types';
import { OrderStockTransitionDto } from './dto/order-stock-transition.dto';
import { OrdersService } from './orders.service';

@ApiTags('orders')
@Controller('orders')
@UseGuards(JwtAuthGuard, AuthorizationGuard)
@ApiBearerAuth('access-token')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @ApiOperation({ summary: 'List orders (placeholder)' })
  @RequireRoles(UserRole.ADMIN, UserRole.STAFF)
  @RequirePermissions(PermissionCode.ORDER_MANAGE)
  getOrders() {
    return {
      success: true,
      data: {
        message: 'Order endpoint authorized',
      },
    };
  }

  @Post('events/created')
  @ApiOperation({
    summary: 'Reserve inventory for newly created order (placeholder)',
  })
  @RequireRoles(UserRole.ADMIN, UserRole.STAFF)
  @RequirePermissions(PermissionCode.ORDER_MANAGE)
  async onOrderCreated(@Body() payload: OrderStockTransitionDto) {
    await this.ordersService.reserveStock(payload.product_id, payload.quantity);
    return { success: true, message: 'Stock reserved successfully' };
  }

  @Post('events/canceled')
  @ApiOperation({
    summary: 'Release reserved inventory for canceled order (placeholder)',
  })
  @RequireRoles(UserRole.ADMIN, UserRole.STAFF)
  @RequirePermissions(PermissionCode.ORDER_MANAGE)
  async onOrderCanceled(@Body() payload: OrderStockTransitionDto) {
    await this.ordersService.releaseStock(payload.product_id, payload.quantity);
    return { success: true, message: 'Reserved stock released successfully' };
  }

  @Post('events/completed')
  @ApiOperation({
    summary: 'Commit stock OUT for completed order (placeholder)',
  })
  @RequireRoles(UserRole.ADMIN, UserRole.STAFF)
  @RequirePermissions(PermissionCode.ORDER_MANAGE)
  async onOrderCompleted(@Body() payload: OrderStockTransitionDto) {
    await this.ordersService.completeStockOut(
      payload.product_id,
      payload.quantity,
    );
    return { success: true, message: 'Stock committed successfully' };
  }
}
