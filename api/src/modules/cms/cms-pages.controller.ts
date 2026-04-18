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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionCode } from '../authorization/authorization.types';
import { RequirePermissions } from '../authorization/decorators/require-permissions.decorator';
import { AuthorizationGuard } from '../authorization/guards/authorization.guard';
import { CmsApplicationService } from './cms.application.service';
import { CreateCmsPageDto } from './dto/create-cms-page.dto';
import { CreateCmsSectionDto } from './dto/create-cms-section.dto';
import { ReorderCmsSectionsDto } from './dto/reorder-cms-sections.dto';

@ApiTags('cms')
@Controller('cms/pages')
export class CmsPagesController {
  constructor(private readonly cmsApplication: CmsApplicationService) {}

  @Get('by-key/:key')
  @ApiOperation({ summary: 'Get published page tree by key (public, cached)' })
  async getPublishedByKey(@Param('key') key: string) {
    const data = await this.cmsApplication.getPublishedPageByKey(key);
    return { success: true, data };
  }

  @Get()
  @UseGuards(JwtAuthGuard, AuthorizationGuard)
  @RequirePermissions(PermissionCode.CMS_READ)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'List CMS pages (admin)' })
  async listPages() {
    const data = await this.cmsApplication.listPagesAdmin();
    return { success: true, data };
  }

  @Post()
  @UseGuards(JwtAuthGuard, AuthorizationGuard)
  @RequirePermissions(PermissionCode.CMS_EDIT)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Create CMS page (admin)' })
  async createPage(@Body() body: CreateCmsPageDto) {
    const data = await this.cmsApplication.createPage(body);
    return { success: true, data };
  }

  @Get(':pageId')
  @UseGuards(JwtAuthGuard, AuthorizationGuard)
  @RequirePermissions(PermissionCode.CMS_READ)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get CMS page by id including inactive (admin)' })
  async getPageById(@Param('pageId', ParseUUIDPipe) pageId: string) {
    const data = await this.cmsApplication.getPageAdmin(pageId);
    return { success: true, data };
  }

  @Post(':pageId/sections')
  @UseGuards(JwtAuthGuard, AuthorizationGuard)
  @RequirePermissions(PermissionCode.CMS_EDIT)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Add section to page (admin)' })
  async addSection(
    @Param('pageId', ParseUUIDPipe) pageId: string,
    @Body() body: CreateCmsSectionDto,
  ) {
    const data = await this.cmsApplication.addSection(pageId, {
      type: body.type,
      title: body.title,
      sort_order: body.sort_order,
      is_active: body.is_active,
    });
    return { success: true, data };
  }

  @Patch(':pageId/sections/reorder')
  @UseGuards(JwtAuthGuard, AuthorizationGuard)
  @RequirePermissions(PermissionCode.CMS_EDIT)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Reorder sections on page (admin)' })
  async reorderSections(
    @Param('pageId', ParseUUIDPipe) pageId: string,
    @Body() body: ReorderCmsSectionsDto,
  ) {
    const data = await this.cmsApplication.reorderSections(
      pageId,
      body.section_ids,
    );
    return { success: true, data };
  }
}
