import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorizationModule } from '../../core/authorization/authorization.module';
import { ProductEntity } from '../products/product.entity';
import { MarketingModule } from '../marketing/marketing.module';
import { StorageModule } from '../../core/storage/storage.module';
import { WishlistEventOutboxEntity } from './entities/wishlist-event-outbox.entity';
import { WishlistItemEntity } from './entities/wishlist-item.entity';
import { WishlistEventDispatcherService } from './events/wishlist-event-dispatcher.service';
import { WishlistOutboxProcessor } from './wishlist-outbox.processor';
import { WishlistApplicationService } from './wishlist.application.service';
import { WishlistController } from './wishlist.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WishlistItemEntity,
      WishlistEventOutboxEntity,
      ProductEntity,
    ]),
    AuthorizationModule,
    StorageModule,
    MarketingModule,
  ],
  controllers: [WishlistController],
  providers: [
    WishlistApplicationService,
    WishlistEventDispatcherService,
    WishlistOutboxProcessor,
  ],
  exports: [WishlistApplicationService],
})
export class WishlistModule {}
