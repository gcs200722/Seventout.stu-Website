import {
  Body,
  Controller,
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
import { RequirePermissions } from '../../core/authorization/decorators/require-permissions.decorator';
import { RequireRoles } from '../../core/authorization/decorators/require-roles.decorator';
import { AuthorizationGuard } from '../../core/authorization/guards/authorization.guard';
import {
  PermissionCode,
  UserRole,
} from '../../core/authorization/authorization.types';
import { CreateFulfillmentDto } from './dto/create-fulfillment.dto';
import { HandleFailedDeliveryDto } from './dto/handle-failed-delivery.dto';
import { UpdateFulfillmentStatusDto } from './dto/update-fulfillment-status.dto';
import { FulfillmentService } from './fulfillment.service';

@ApiTags('fulfillments')
@Controller('fulfillments')
@UseGuards(JwtAuthGuard, AuthorizationGuard)
@ApiBearerAuth('access-token')
export class FulfillmentController {
  constructor(private readonly fulfillmentService: FulfillmentService) {}

  @Post()
  @ApiOperation({ summary: 'Create fulfillment for order' })
  @RequireRoles(UserRole.STAFF, UserRole.ADMIN)
  @RequirePermissions(PermissionCode.FULFILLMENT_UPDATE)
  async createFulfillment(@Body() payload: CreateFulfillmentDto) {
    const data = await this.fulfillmentService.createFulfillment(payload);
    return { success: true, data };
  }

  @Get(':orderId')
  @ApiOperation({ summary: 'Get fulfillment by order id' })
  @RequireRoles(UserRole.USER, UserRole.STAFF, UserRole.ADMIN)
  @RequirePermissions(PermissionCode.FULFILLMENT_READ)
  async getByOrderId(
    @CurrentUser() user: AuthenticatedUser,
    @Param('orderId', ParseUUIDPipe) orderId: string,
  ) {
    const data = await this.fulfillmentService.getByOrderId(user, orderId);
    return { success: true, data };
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update fulfillment shipping status' })
  @RequireRoles(UserRole.STAFF, UserRole.ADMIN)
  @RequirePermissions(PermissionCode.FULFILLMENT_UPDATE)
  async updateStatus(
    @Param('id', ParseUUIDPipe) fulfillmentId: string,
    @Body() payload: UpdateFulfillmentStatusDto,
  ) {
    const data = await this.fulfillmentService.updateStatus(
      fulfillmentId,
      payload,
    );
    return { success: true, data };
  }

  @Patch(':id/failed-delivery-action')
  @ApiOperation({ summary: 'Handle failed delivery action' })
  @RequireRoles(UserRole.STAFF, UserRole.ADMIN)
  @RequirePermissions(PermissionCode.FULFILLMENT_UPDATE)
  async handleFailedDeliveryAction(
    @Param('id', ParseUUIDPipe) fulfillmentId: string,
    @Body() payload: HandleFailedDeliveryDto,
  ) {
    const data = await this.fulfillmentService.handleFailedDeliveryAction(
      fulfillmentId,
      payload,
    );
    return { success: true, data };
  }
}
