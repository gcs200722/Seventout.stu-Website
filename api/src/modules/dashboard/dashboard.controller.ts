import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequirePermissions } from '../authorization/decorators/require-permissions.decorator';
import { RequireRoles } from '../authorization/decorators/require-roles.decorator';
import { AuthorizationGuard } from '../authorization/guards/authorization.guard';
import { PermissionCode, UserRole } from '../authorization/authorization.types';
import { DashboardService } from './dashboard.service';
import { GetDashboardSummaryQueryDto } from './dto/get-dashboard-summary.query.dto';

@ApiTags('admin-dashboard')
@Controller('admin/dashboard')
@UseGuards(JwtAuthGuard, AuthorizationGuard)
@ApiBearerAuth('access-token')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Get admin dashboard summary' })
  @RequireRoles(UserRole.STAFF, UserRole.ADMIN)
  @RequirePermissions(PermissionCode.ORDER_MANAGE)
  async getSummary(@Query() query: GetDashboardSummaryQueryDto) {
    const data = await this.dashboardService.getSummary(query.compare);
    return { success: true, data };
  }
}
