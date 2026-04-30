import {
  Body,
  Controller,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PlatformJwtAuthGuard } from '../core/auth/guards/platform-jwt-auth.guard';
import { RequirePlatformPermissions } from '../core/authorization/decorators/require-platform-permissions.decorator';
import { PlatformAuthorizationGuard } from '../core/authorization/guards/platform-authorization.guard';
import { PlatformPermissionCode } from '../../tenant/core/authorization/authorization.types';
import { UpdateTenantStatusDto } from './dto/update-tenant-status.dto';
import { TenantsService } from './tenants.service';

@ApiTags('platform-tenants')
@ApiBearerAuth('access-token')
@Controller('platform/tenants')
@UseGuards(PlatformJwtAuthGuard, PlatformAuthorizationGuard)
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get()
  @RequirePlatformPermissions(PlatformPermissionCode.PLATFORM_TENANT_READ)
  @ApiOperation({ summary: 'List tenants (platform scope)' })
  @ApiOkResponse({ description: 'Tenant list' })
  async listTenants() {
    const tenants = await this.tenantsService.listAll();
    return {
      success: true,
      data: tenants.map((tenant) => ({
        id: tenant.id,
        slug: tenant.slug,
        name: tenant.name,
        status: tenant.status,
        created_at: tenant.createdAt,
        updated_at: tenant.updatedAt,
      })),
    };
  }

  @Patch(':id/status')
  @RequirePlatformPermissions(PlatformPermissionCode.PLATFORM_TENANT_MANAGE)
  @ApiOperation({ summary: 'Update tenant status (platform scope)' })
  @HttpCode(200)
  async updateStatus(
    @Param('id') id: string,
    @Body() payload: UpdateTenantStatusDto,
  ) {
    const tenant = await this.tenantsService.updateStatus(id, payload.status);
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }
    return {
      success: true,
      data: {
        id: tenant.id,
        slug: tenant.slug,
        name: tenant.name,
        status: tenant.status,
      },
    };
  }
}
