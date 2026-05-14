import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorizationModule } from '../authorization/authorization.module';
import { InventoryEntity } from '../inventory/entities/inventory.entity';
import { ProductEntity } from '../products/product.entity';
import { ProductVariantEntity } from '../products/product-variant.entity';
import { CART_CACHE_PORT, InMemoryCartCacheAdapter } from './cart-cache.port';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';
import { CartItemEntity } from './entities/cart-item.entity';
import { CartEntity } from './entities/cart.entity';
import { GuestCartController } from './guest-cart.controller';
import { GuestSessionGuard } from './guards/guest-session.guard';
import { GuestSessionCookieInterceptor } from './interceptors/guest-session-cookie.interceptor';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CartEntity,
      CartItemEntity,
      ProductEntity,
      ProductVariantEntity,
      InventoryEntity,
    ]),
    AuthorizationModule,
  ],
  controllers: [CartController, GuestCartController],
  providers: [
    CartService,
    GuestSessionGuard,
    GuestSessionCookieInterceptor,
    {
      provide: CART_CACHE_PORT,
      useClass: InMemoryCartCacheAdapter,
    },
  ],
  exports: [CART_CACHE_PORT, CartService],
})
export class CartModule {}
