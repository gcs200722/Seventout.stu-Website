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
import { CreateReturnDto } from './dto/create-return.dto';
import { ListReturnsQueryDto } from './dto/list-returns.query.dto';
import { UpdateReturnStatusDto } from './dto/update-return-status.dto';
import { ReturnsService } from './returns.service';

@ApiTags('returns')
@Controller('returns')
@UseGuards(JwtAuthGuard, AuthorizationGuard)
@ApiBearerAuth('access-token')
export class ReturnsController {
  constructor(private readonly returnsService: ReturnsService) {}

  @Post()
  @ApiOperation({ summary: 'Create return request' })
  @RequireRoles(UserRole.USER, UserRole.ADMIN)
  @RequirePermissions(PermissionCode.RETURN_CREATE)
  async createReturn(
    @CurrentUser() user: AuthenticatedUser,
    @Body() payload: CreateReturnDto,
  ) {
    const data = await this.returnsService.createReturn(user, payload);
    return { success: true, data };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get return detail' })
  @RequireRoles(UserRole.USER, UserRole.STAFF, UserRole.ADMIN)
  @RequirePermissions(PermissionCode.RETURN_READ)
  async getReturnById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) returnId: string,
  ) {
    const data = await this.returnsService.getReturnById(user, returnId);
    return { success: true, data };
  }

  @Get()
  @ApiOperation({ summary: 'List returns' })
  @RequireRoles(UserRole.USER, UserRole.STAFF, UserRole.ADMIN)
  @RequirePermissions(PermissionCode.RETURN_READ)
  async listReturns(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListReturnsQueryDto,
  ) {
    const result = await this.returnsService.listReturns(user, query);
    return {
      success: true,
      data: result.items,
      pagination: { page: query.page, limit: query.limit, total: result.total },
    };
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update return status' })
  @RequireRoles(UserRole.STAFF, UserRole.ADMIN)
  @RequirePermissions(PermissionCode.RETURN_UPDATE)
  async updateStatus(
    @Param('id', ParseUUIDPipe) returnId: string,
    @Body() payload: UpdateReturnStatusDto,
  ) {
    const data = await this.returnsService.updateStatus(returnId, payload);
    return { success: true, data };
  }
}
