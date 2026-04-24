import {
  Body,
  Controller,
  Get,
  Headers,
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
import { PermissionCode, UserRole } from '../authorization/authorization.types';
import { RequirePermissions } from '../authorization/decorators/require-permissions.decorator';
import { RequireRoles } from '../authorization/decorators/require-roles.decorator';
import { AuthorizationGuard } from '../authorization/guards/authorization.guard';
import { AdjustInventoryDto } from './dto/adjust-inventory.dto';
import { ChannelWebhookDto } from './dto/channel-webhook.dto';
import { ListInventoryMovementsQueryDto } from './dto/list-inventory-movements.query.dto';
import { ListInventoryQueryDto } from './dto/list-inventory.query.dto';
import { SyncInventoryDto } from './dto/sync-inventory.dto';
import { InventoryWebhookService } from './inventory-webhook.service';
import { InventoryChannel } from './inventory.types';
import { InventoryService } from './inventory.service';

@ApiTags('inventory')
@Controller('inventory')
@UseGuards(JwtAuthGuard, AuthorizationGuard)
@ApiBearerAuth('access-token')
export class InventoryController {
  constructor(
    private readonly inventoryService: InventoryService,
    private readonly inventoryWebhookService: InventoryWebhookService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List inventory' })
  @RequireRoles(UserRole.ADMIN, UserRole.STAFF)
  @RequirePermissions(PermissionCode.INVENTORY_READ)
  async listInventory(@Query() query: ListInventoryQueryDto) {
    const { items, total } = await this.inventoryService.listInventory(query);
    return {
      success: true,
      data: items,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
      },
    };
  }

  @Get('movements')
  @ApiOperation({ summary: 'List inventory movements' })
  @RequireRoles(UserRole.ADMIN, UserRole.STAFF)
  @RequirePermissions(PermissionCode.INVENTORY_READ)
  async listMovements(@Query() query: ListInventoryMovementsQueryDto) {
    const { items, total } = await this.inventoryService.listMovements(query);
    return {
      success: true,
      data: items,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
      },
    };
  }

  @Get('by-product/:product_id')
  @ApiOperation({
    summary: 'Get inventory by product (all variants × channels)',
  })
  @RequireRoles(UserRole.ADMIN, UserRole.STAFF)
  @RequirePermissions(PermissionCode.INVENTORY_READ)
  async getProductInventory(
    @Param('product_id', ParseUUIDPipe) productId: string,
  ) {
    return {
      success: true,
      data: await this.inventoryService.getInventoryByProductId(productId),
    };
  }

  @Patch('variants/:variant_id/adjust')
  @ApiOperation({ summary: 'Adjust inventory for a product variant' })
  @RequireRoles(UserRole.ADMIN, UserRole.STAFF)
  @RequirePermissions(PermissionCode.INVENTORY_MANAGE)
  async adjustInventory(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('variant_id', ParseUUIDPipe) variantId: string,
    @Body() payload: AdjustInventoryDto,
  ) {
    await this.inventoryService.adjustInventory(variantId, payload, actor);
    return {
      success: true,
      message: 'Inventory adjusted successfully',
    };
  }

  @Post('sync')
  @ApiOperation({ summary: 'Enqueue inventory sync to external channel' })
  @RequireRoles(UserRole.ADMIN, UserRole.STAFF)
  @RequirePermissions(PermissionCode.INVENTORY_MANAGE)
  async syncInventory(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() payload: SyncInventoryDto,
  ) {
    await this.inventoryService.requestSync(payload, actor);
    return {
      success: true,
      message: 'Inventory synced successfully',
    };
  }

  @Post('webhooks/:channel')
  @ApiOperation({
    summary: 'Receive channel webhook for inventory/order stock events',
  })
  async receiveWebhook(
    @Param('channel') channel: InventoryChannel,
    @Body() payload: ChannelWebhookDto,
    @Headers('x-webhook-signature') signature?: string,
  ) {
    await this.inventoryWebhookService.receiveWebhook(
      channel,
      payload,
      signature,
    );
    return {
      success: true,
      message: 'Webhook accepted',
    };
  }
}
