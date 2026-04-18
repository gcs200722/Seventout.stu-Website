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
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { CouponEntity } from './entities/coupon.entity';
import { PromotionsApplicationService } from './promotions.application.service';

@ApiTags('coupons')
@Controller('coupons')
@UseGuards(JwtAuthGuard, AuthorizationGuard)
@ApiBearerAuth('access-token')
export class CouponsAdminController {
  constructor(
    private readonly promotionsApplication: PromotionsApplicationService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List coupons' })
  @RequirePermissions(PermissionCode.PROMOTION_READ)
  async list() {
    const data = await this.promotionsApplication.listCouponsAdmin();
    return { success: true, data };
  }

  @Post()
  @ApiOperation({ summary: 'Create coupon' })
  @RequirePermissions(PermissionCode.PROMOTION_MANAGE)
  async create(@Body() dto: CreateCouponDto) {
    const row: Partial<CouponEntity> = {
      code: dto.code,
      type: dto.type,
      value: dto.value,
      minOrderValue: dto.min_order_value ?? 0,
      maxDiscount: dto.max_discount ?? null,
      usageLimit: dto.usage_limit ?? null,
      maxUsesPerUser: dto.max_uses_per_user ?? 1,
      startDate: new Date(dto.start_date),
      endDate: dto.end_date ? new Date(dto.end_date) : null,
      isActive: dto.is_active ?? true,
    };
    const data = await this.promotionsApplication.createCouponAdmin(row);
    return { success: true, data };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update coupon' })
  @RequirePermissions(PermissionCode.PROMOTION_MANAGE)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCouponDto,
  ) {
    const patch: Partial<CouponEntity> = {};
    if (dto.code !== undefined) {
      patch.code = dto.code;
    }
    if (dto.type !== undefined) {
      patch.type = dto.type;
    }
    if (dto.value !== undefined) {
      patch.value = dto.value;
    }
    if (dto.min_order_value !== undefined) {
      patch.minOrderValue = dto.min_order_value;
    }
    if (dto.max_discount !== undefined) {
      patch.maxDiscount = dto.max_discount;
    }
    if (dto.usage_limit !== undefined) {
      patch.usageLimit = dto.usage_limit;
    }
    if (dto.max_uses_per_user !== undefined) {
      patch.maxUsesPerUser = dto.max_uses_per_user;
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
    const data = await this.promotionsApplication.updateCouponAdmin(id, patch);
    return { success: true, data };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete coupon' })
  @RequirePermissions(PermissionCode.PROMOTION_MANAGE)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.promotionsApplication.deleteCouponAdmin(id);
    return { success: true, message: 'Coupon deleted' };
  }
}
