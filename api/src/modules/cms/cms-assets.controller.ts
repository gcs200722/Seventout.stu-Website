import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionCode } from '../authorization/authorization.types';
import { RequirePermissions } from '../authorization/decorators/require-permissions.decorator';
import { AuthorizationGuard } from '../authorization/guards/authorization.guard';
import { CmsAssetsService } from './cms-assets.service';
import { CmsAssetPresignDto } from './dto/cms-asset-presign.dto';
import { CmsAssetRegisterDto } from './dto/cms-asset-register.dto';

@ApiTags('cms')
@Controller('cms/assets')
@UseGuards(JwtAuthGuard, AuthorizationGuard)
@ApiBearerAuth('access-token')
export class CmsAssetsController {
  constructor(private readonly cmsAssets: CmsAssetsService) {}

  @Get()
  @RequirePermissions(PermissionCode.CMS_READ)
  @ApiOperation({ summary: 'List recent CMS assets (admin)' })
  async list(@Query('limit') limit?: string) {
    const n = limit ? Number(limit) : 48;
    const rows = await this.cmsAssets.listRecent(Number.isFinite(n) ? n : 48);
    return {
      success: true,
      data: rows.map((a) => ({
        id: a.id,
        object_key: a.objectKey,
        public_url: a.publicUrl,
        mime: a.mime,
        alt: a.alt,
        width: a.width,
        height: a.height,
        created_at: a.createdAt.toISOString(),
      })),
    };
  }

  @Post('presign')
  @RequirePermissions(PermissionCode.CMS_EDIT)
  @ApiOperation({ summary: 'Presign PUT upload for CMS asset (admin)' })
  async presign(@Body() body: CmsAssetPresignDto) {
    const data = await this.cmsAssets.presignUpload(
      body.content_type,
      body.filename,
    );
    return { success: true, data };
  }

  @Post('register')
  @RequirePermissions(PermissionCode.CMS_EDIT)
  @ApiOperation({ summary: 'Register uploaded CMS asset row (admin)' })
  async register(@Body() body: CmsAssetRegisterDto) {
    const row = await this.cmsAssets.registerAsset({
      objectKey: body.object_key,
      publicUrl: body.public_url,
      mime: body.mime,
      alt: body.alt,
      width: body.width,
      height: body.height,
    });
    return {
      success: true,
      data: {
        id: row.id,
        object_key: row.objectKey,
        public_url: row.publicUrl,
        mime: row.mime,
        alt: row.alt,
        width: row.width,
        height: row.height,
        created_at: row.createdAt.toISOString(),
      },
    };
  }
}
