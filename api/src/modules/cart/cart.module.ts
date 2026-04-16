import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorizationModule } from '../authorization/authorization.module';
import { InventoryEntity } from '../inventory/entities/inventory.entity';
import { ProductEntity } from '../products/product.entity';
import { CART_CACHE_PORT, InMemoryCartCacheAdapter } from './cart-cache.port';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';
import { CartItemEntity } from './entities/cart-item.entity';
import { CartEntity } from './entities/cart.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CartEntity,
      CartItemEntity,
      ProductEntity,
      InventoryEntity,
    ]),
    AuthorizationModule,
  ],
  controllers: [CartController],
  providers: [
    CartService,
    {
      provide: CART_CACHE_PORT,
      useClass: InMemoryCartCacheAdapter,
    },
  ],
})
export class CartModule {}
