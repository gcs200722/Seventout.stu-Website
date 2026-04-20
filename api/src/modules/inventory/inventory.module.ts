import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { AuthorizationModule } from '../authorization/authorization.module';
import { ProductEntity } from '../products/product.entity';
import { QueueModule } from '../queue/queue.module';
import { ShopeeInventoryClient } from './channels/shopee/shopee-inventory.client';
import { TiktokInventoryClient } from './channels/tiktok/tiktok-inventory.client';
import { INVENTORY_CHANNEL_CLIENTS } from './inventory.constants';
import { InventoryController } from './inventory.controller';
import { InventorySyncProcessor } from './inventory-sync.processor';
import { InventoryService } from './inventory.service';
import { InventoryWebhookService } from './inventory-webhook.service';
import { InventoryEntity } from './entities/inventory.entity';
import { InventoryMovementEntity } from './entities/inventory-movement.entity';
import { ProductChannelMappingEntity } from './entities/product-channel-mapping.entity';
import { InventoryWebhookEventEntity } from './entities/inventory-webhook-event.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProductEntity,
      InventoryEntity,
      InventoryMovementEntity,
      ProductChannelMappingEntity,
      InventoryWebhookEventEntity,
    ]),
    AuthorizationModule,
    AuditModule,
    QueueModule,
  ],
  controllers: [InventoryController],
  providers: [
    InventoryService,
    InventoryWebhookService,
    InventorySyncProcessor,
    ShopeeInventoryClient,
    TiktokInventoryClient,
    {
      provide: INVENTORY_CHANNEL_CLIENTS,
      useFactory: (
        shopeeClient: ShopeeInventoryClient,
        tiktokClient: TiktokInventoryClient,
      ) => [shopeeClient, tiktokClient],
      inject: [ShopeeInventoryClient, TiktokInventoryClient],
    },
  ],
  exports: [InventoryService],
})
export class InventoryModule {}
