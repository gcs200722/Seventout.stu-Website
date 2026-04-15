import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequirePermissions } from '../authorization/decorators/require-permissions.decorator';
import { RequireRoles } from '../authorization/decorators/require-roles.decorator';
import { AuthorizationGuard } from '../authorization/guards/authorization.guard';
import { PermissionCode, UserRole } from '../authorization/authorization.types';

@ApiTags('orders')
@Controller('orders')
@UseGuards(JwtAuthGuard, AuthorizationGuard)
@ApiBearerAuth('access-token')
export class OrdersController {
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
}
