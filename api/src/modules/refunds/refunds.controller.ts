import {
  Body,
  Controller,
  Get,
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
import { CreateRefundDto } from './dto/create-refund.dto';
import { ListRefundsQueryDto } from './dto/list-refunds.query.dto';
import { UpdateRefundStatusDto } from './dto/update-refund-status.dto';
import { RefundsService } from './refunds.service';

@ApiTags('refunds')
@Controller('refunds')
@UseGuards(JwtAuthGuard, AuthorizationGuard)
@ApiBearerAuth('access-token')
export class RefundsController {
  constructor(private readonly refundsService: RefundsService) {}

  @Post()
  @ApiOperation({ summary: 'Create refund' })
  @RequireRoles(UserRole.STAFF, UserRole.ADMIN)
  @RequirePermissions(PermissionCode.REFUND_CREATE)
  async createRefund(@Body() payload: CreateRefundDto) {
    const data = await this.refundsService.createRefund(payload);
    return { success: true, data };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get refund detail' })
  @RequireRoles(UserRole.USER, UserRole.STAFF, UserRole.ADMIN)
  @RequirePermissions(PermissionCode.REFUND_READ)
  async getRefundById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) refundId: string,
  ) {
    const data = await this.refundsService.getRefundById(user, refundId);
    return { success: true, data };
  }

  @Get()
  @ApiOperation({ summary: 'List refunds' })
  @RequireRoles(UserRole.USER, UserRole.STAFF, UserRole.ADMIN)
  @RequirePermissions(PermissionCode.REFUND_READ)
  async listRefunds(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListRefundsQueryDto,
  ) {
    const result = await this.refundsService.listRefunds(user, query);
    return {
      success: true,
      data: result.items,
      pagination: { page: query.page, limit: query.limit, total: result.total },
    };
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update refund status' })
  @RequireRoles(UserRole.STAFF, UserRole.ADMIN)
  @RequirePermissions(PermissionCode.REFUND_UPDATE)
  async updateStatus(
    @Param('id', ParseUUIDPipe) refundId: string,
    @Body() payload: UpdateRefundStatusDto,
  ) {
    const data = await this.refundsService.updateStatus(refundId, payload);
    return { success: true, data };
  }
}
