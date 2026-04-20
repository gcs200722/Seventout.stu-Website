import {
  Body,
  Controller,
  Delete,
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
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { CreatePromotionRuleDto } from './dto/create-promotion-rule.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { PromotionCampaignEntity } from './entities/promotion-campaign.entity';
import { PromotionsApplicationService } from './promotions.application.service';

@ApiTags('promotion-campaigns')
@Controller('promotion-campaigns')
@UseGuards(JwtAuthGuard, AuthorizationGuard)
@ApiBearerAuth('access-token')
export class PromotionCampaignsAdminController {
  constructor(
    private readonly promotionsApplication: PromotionsApplicationService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List promotion campaigns' })
  @RequirePermissions(PermissionCode.PROMOTION_READ)
  async list() {
    const data = await this.promotionsApplication.listCampaignsAdmin();
    return { success: true, data };
  }

  @Post()
  @ApiOperation({ summary: 'Create promotion campaign' })
  @RequirePermissions(PermissionCode.PROMOTION_MANAGE)
  async create(@Body() dto: CreateCampaignDto) {
    const row: Partial<PromotionCampaignEntity> = {
      name: dto.name,
      type: dto.type,
      discountType: dto.discount_type,
      value: dto.value,
      maxDiscount: dto.max_discount ?? null,
      priority: dto.priority ?? 0,
      startDate: new Date(dto.start_date),
      endDate: dto.end_date ? new Date(dto.end_date) : null,
      isActive: dto.is_active ?? true,
    };
    const data = await this.promotionsApplication.createCampaignAdmin(row);
    return { success: true, data };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update promotion campaign' })
  @RequirePermissions(PermissionCode.PROMOTION_MANAGE)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCampaignDto,
  ) {
    const patch: Partial<PromotionCampaignEntity> = {};
    if (dto.name !== undefined) {
      patch.name = dto.name;
    }
    if (dto.type !== undefined) {
      patch.type = dto.type;
    }
    if (dto.discount_type !== undefined) {
      patch.discountType = dto.discount_type;
    }
    if (dto.value !== undefined) {
      patch.value = dto.value;
    }
    if (dto.max_discount !== undefined) {
      patch.maxDiscount = dto.max_discount;
    }
    if (dto.priority !== undefined) {
      patch.priority = dto.priority;
    }
    if (dto.start_date !== undefined) {
      patch.startDate = new Date(dto.start_date);
    }
    if (dto.end_date !== undefined) {
      patch.endDate = dto.end_date ? new Date(dto.end_date) : null;
    }
    if (dto.is_active !== undefined) {
      patch.isActive = dto.is_active;
    }
    const data = await this.promotionsApplication.updateCampaignAdmin(
      id,
      patch,
    );
    return { success: true, data };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete promotion campaign' })
  @RequirePermissions(PermissionCode.PROMOTION_MANAGE)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.promotionsApplication.deleteCampaignAdmin(id);
    return { success: true, message: 'Campaign deleted' };
  }

  @Post(':id/rules')
  @ApiOperation({ summary: 'Add rule to campaign' })
  @RequirePermissions(PermissionCode.PROMOTION_MANAGE)
  async addRule(
    @Param('id', ParseUUIDPipe) campaignId: string,
    @Body() dto: CreatePromotionRuleDto,
  ) {
    const data = await this.promotionsApplication.createRuleAdmin(campaignId, {
      condition: dto.condition,
      action: dto.action,
      sortOrder: dto.sort_order ?? 0,
    });
    return { success: true, data };
  }
}
