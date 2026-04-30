import {
  Body,
  Controller,
  Delete,
  Param,
  ParseUUIDPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { PermissionCode } from '../../core/authorization/authorization.types';
import { RequirePermissions } from '../../core/authorization/decorators/require-permissions.decorator';
import { AuthorizationGuard } from '../../core/authorization/guards/authorization.guard';
import { UpdatePromotionRuleDto } from './dto/update-promotion-rule.dto';
import { PromotionRuleEntity } from './entities/promotion-rule.entity';
import { PromotionsApplicationService } from './promotions.application.service';

@ApiTags('promotion-rules')
@Controller('promotion-rules')
@UseGuards(JwtAuthGuard, AuthorizationGuard)
@ApiBearerAuth('access-token')
export class PromotionRulesAdminController {
  constructor(
    private readonly promotionsApplication: PromotionsApplicationService,
  ) {}

  @Patch(':id')
  @ApiOperation({ summary: 'Update promotion rule' })
  @RequirePermissions(PermissionCode.PROMOTION_MANAGE)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePromotionRuleDto,
  ) {
    const patch: Partial<PromotionRuleEntity> = {};
    if (dto.condition !== undefined) {
      patch.condition = dto.condition;
    }
    if (dto.action !== undefined) {
      patch.action = dto.action;
    }
    if (dto.sort_order !== undefined) {
      patch.sortOrder = dto.sort_order;
    }
    const data = await this.promotionsApplication.updateRuleAdmin(id, patch);
    return { success: true, data };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete promotion rule' })
  @RequirePermissions(PermissionCode.PROMOTION_MANAGE)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.promotionsApplication.deleteRuleAdmin(id);
    return { success: true, message: 'Rule deleted' };
  }
}
