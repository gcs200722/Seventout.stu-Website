import {
  Body,
  Controller,
  Get,
  Headers,
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
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { ListPaymentsQueryDto } from './dto/list-payments.query.dto';
import { PaymentsService } from './payments.service';

@ApiTags('payments')
@Controller('payments')
@UseGuards(JwtAuthGuard, AuthorizationGuard)
@ApiBearerAuth('access-token')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @ApiOperation({ summary: 'Create payment for an order' })
  @RequireRoles(UserRole.USER, UserRole.ADMIN)
  @RequirePermissions(PermissionCode.PAYMENT_CREATE)
  async createPayment(
    @CurrentUser() user: AuthenticatedUser,
    @Body() payload: CreatePaymentDto,
    @Headers('x-idempotency-key') idempotencyKey?: string,
  ) {
    const data = await this.paymentsService.createPayment(
      user,
      payload,
      idempotencyKey,
    );
    return { success: true, data };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get payment detail' })
  @RequireRoles(UserRole.USER, UserRole.STAFF, UserRole.ADMIN)
  @RequirePermissions(PermissionCode.PAYMENT_READ)
  async getPaymentById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) paymentId: string,
  ) {
    const data = await this.paymentsService.getPaymentById(user, paymentId);
    return { success: true, data };
  }

  @Get()
  @ApiOperation({ summary: 'List payments' })
  @RequireRoles(UserRole.STAFF, UserRole.ADMIN)
  @RequirePermissions(PermissionCode.PAYMENT_MANAGE)
  async listPayments(@Query() query: ListPaymentsQueryDto) {
    const result = await this.paymentsService.listPayments(query);
    return {
      success: true,
      data: result.items,
      pagination: { page: query.page, limit: query.limit, total: result.total },
    };
  }

  @Post(':id/confirm')
  @ApiOperation({ summary: 'Confirm payment status (mock)' })
  @RequireRoles(UserRole.ADMIN)
  @RequirePermissions(PermissionCode.PAYMENT_MANAGE)
  async confirmPayment(
    @Param('id', ParseUUIDPipe) paymentId: string,
    @Body() payload: ConfirmPaymentDto,
  ) {
    const data = await this.paymentsService.confirmPayment(paymentId, payload);
    return { success: true, data };
  }
}
