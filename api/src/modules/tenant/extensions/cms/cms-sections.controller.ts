import {
  Body,
  Controller,
  Delete,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { PermissionCode } from '../../core/authorization/authorization.types';
import { RequirePermissions } from '../../core/authorization/decorators/require-permissions.decorator';
import { AuthorizationGuard } from '../../core/authorization/guards/authorization.guard';
import { CmsApplicationService } from './cms.application.service';
import { CreateCmsBlockDto } from './dto/create-cms-block.dto';
import { ReorderCmsBlocksDto } from './dto/reorder-cms-blocks.dto';
import { UpdateCmsBlockDto } from './dto/update-cms-block.dto';
import { UpdateCmsSectionDto } from './dto/update-cms-section.dto';

@ApiTags('cms')
@Controller('cms/sections')
export class CmsSectionsController {
  constructor(private readonly cmsApplication: CmsApplicationService) {}

  @Patch('blocks/:blockId')
  @UseGuards(JwtAuthGuard, AuthorizationGuard)
  @RequirePermissions(PermissionCode.CMS_EDIT)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update block (admin)' })
  async updateBlock(
    @Param('blockId', ParseUUIDPipe) blockId: string,
    @Body() body: UpdateCmsBlockDto,
  ) {
    const data = await this.cmsApplication.updateBlock(blockId, {
      type: body.type,
      data: body.data,
      sort_order: body.sort_order,
      is_active: body.is_active,
      appearance: body.appearance,
    });
    return { success: true, data };
  }

  @Delete('blocks/:blockId')
  @UseGuards(JwtAuthGuard, AuthorizationGuard)
  @RequirePermissions(PermissionCode.CMS_EDIT)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Soft-delete block (admin)' })
  async deleteBlock(@Param('blockId', ParseUUIDPipe) blockId: string) {
    await this.cmsApplication.deleteBlock(blockId);
    return { success: true, data: null };
  }

  @Post(':sectionId/blocks')
  @UseGuards(JwtAuthGuard, AuthorizationGuard)
  @RequirePermissions(PermissionCode.CMS_EDIT)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Add block to section (admin)' })
  async addBlock(
    @Param('sectionId', ParseUUIDPipe) sectionId: string,
    @Body() body: CreateCmsBlockDto,
  ) {
    const data = await this.cmsApplication.addBlock(sectionId, {
      type: body.type,
      data: body.data,
      sort_order: body.sort_order,
      is_active: body.is_active,
      appearance: body.appearance,
    });
    return { success: true, data };
  }

  @Patch(':sectionId/blocks/reorder')
  @UseGuards(JwtAuthGuard, AuthorizationGuard)
  @RequirePermissions(PermissionCode.CMS_EDIT)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Reorder blocks in section (admin)' })
  async reorderBlocks(
    @Param('sectionId', ParseUUIDPipe) sectionId: string,
    @Body() body: ReorderCmsBlocksDto,
  ) {
    const data = await this.cmsApplication.reorderSectionBlocks(
      sectionId,
      body.block_ids,
    );
    return { success: true, data };
  }

  @Patch(':sectionId')
  @UseGuards(JwtAuthGuard, AuthorizationGuard)
  @RequirePermissions(PermissionCode.CMS_EDIT)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update section (admin)' })
  async updateSection(
    @Param('sectionId', ParseUUIDPipe) sectionId: string,
    @Body() body: UpdateCmsSectionDto,
  ) {
    const data = await this.cmsApplication.updateSection(sectionId, {
      title: body.title,
      type: body.type,
      sort_order: body.sort_order,
      is_active: body.is_active,
      layout: body.layout,
      targeting: body.targeting,
    });
    return { success: true, data };
  }

  @Delete(':sectionId')
  @UseGuards(JwtAuthGuard, AuthorizationGuard)
  @RequirePermissions(PermissionCode.CMS_EDIT)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Soft-delete section (admin)' })
  async deleteSection(@Param('sectionId', ParseUUIDPipe) sectionId: string) {
    await this.cmsApplication.deleteSection(sectionId);
    return { success: true, data: null };
  }
}
