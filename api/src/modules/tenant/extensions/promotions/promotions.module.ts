import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import Redis from 'ioredis';
import { AuthorizationModule } from '../../core/authorization/authorization.module';
import { CartModule } from '../cart/cart.module';
import { CartItemEntity } from '../cart/entities/cart-item.entity';
import { CartEntity } from '../cart/entities/cart.entity';
import { ProductEntity } from '../products/product.entity';
import { ProductVariantEntity } from '../products/product-variant.entity';
import { ORDER_PRICING_PORT } from '../orders/ports/order-pricing.port';
import { PromotionsOrderPricingAdapter } from './adapters/promotions-order-pricing.adapter';
import { CouponUsageEntity } from './entities/coupon-usage.entity';
import { CouponEntity } from './entities/coupon.entity';
import { PromotionCampaignEntity } from './entities/promotion-campaign.entity';
import { PromotionRuleEntity } from './entities/promotion-rule.entity';
import { CouponsAdminController } from './coupons-admin.controller';
import { PromotionCampaignsAdminController } from './promotion-campaigns-admin.controller';
import { PromotionRulesAdminController } from './promotion-rules-admin.controller';
import { PromotionsActiveController } from './promotions-active.controller';
import { PromotionsCartCouponController } from './promotions-cart-coupon.controller';
import { PromotionsCartQuoteController } from './promotions-cart-quote.controller';
import { PromotionsApplicationService } from './promotions.application.service';
import { PromotionsRepository } from './promotions.repository';
import { PROMOTIONS_ACTIVE_CACHE_PORT } from './promotions-active-cache.port';
import { RedisPromotionsActiveCacheAdapter } from './redis-promotions-active-cache.adapter';

export const PROMOTIONS_REDIS_CLIENT = Symbol('PROMOTIONS_REDIS_CLIENT');

@Module({
  imports: [
    ConfigModule,
    AuthorizationModule,
    CartModule,
    TypeOrmModule.forFeature([
      CouponEntity,
      CouponUsageEntity,
      PromotionCampaignEntity,
      PromotionRuleEntity,
      CartEntity,
      CartItemEntity,
      ProductEntity,
      ProductVariantEntity,
    ]),
  ],
  controllers: [
    PromotionsActiveController,
    PromotionsCartCouponController,
    PromotionsCartQuoteController,
    CouponsAdminController,
    PromotionCampaignsAdminController,
    PromotionRulesAdminController,
  ],
  providers: [
    PromotionsRepository,
    PromotionsApplicationService,
    PromotionsOrderPricingAdapter,
    {
      provide: ORDER_PRICING_PORT,
      useExisting: PromotionsOrderPricingAdapter,
    },
    {
      provide: PROMOTIONS_REDIS_CLIENT,
      useFactory: (configService: ConfigService) =>
        new Redis({
          host: configService.getOrThrow<string>('REDIS_HOST'),
          port: configService.getOrThrow<number>('REDIS_PORT'),
          password: configService.get<string>('REDIS_PASSWORD') || undefined,
          maxRetriesPerRequest: 2,
        }),
      inject: [ConfigService],
    },
    {
      provide: PROMOTIONS_ACTIVE_CACHE_PORT,
      useFactory: (redis: Redis) =>
        new RedisPromotionsActiveCacheAdapter(redis),
      inject: [PROMOTIONS_REDIS_CLIENT],
    },
  ],
  exports: [ORDER_PRICING_PORT, PromotionsApplicationService],
})
export class PromotionsModule {}
