import { Module } from '@nestjs/common';
import { PromotionsModule } from '../promotions/promotions.module';

/**
 * Marketing domain facade: promotions, coupons, campaigns (via {@link PromotionsModule}).
 * Prefer importing `MarketingModule` from products/orders/wishlist to keep a single extension point.
 */
@Module({
  imports: [PromotionsModule],
  exports: [PromotionsModule],
})
export class MarketingModule {}
