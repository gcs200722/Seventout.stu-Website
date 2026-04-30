import { Injectable } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import type { CheckoutCartSnapshot } from '../../orders/ports/order-cart.port';
import type {
  OrderPricingPort,
  PricedCheckoutSnapshot,
} from '../../orders/ports/order-pricing.port';
import { PromotionsApplicationService } from '../promotions.application.service';

@Injectable()
export class PromotionsOrderPricingAdapter implements OrderPricingPort {
  constructor(
    private readonly promotionsApplication: PromotionsApplicationService,
  ) {}

  priceCheckoutSnapshot(
    userId: string,
    cartId: string,
    snapshot: CheckoutCartSnapshot,
    manager?: EntityManager,
  ): Promise<PricedCheckoutSnapshot> {
    return this.promotionsApplication.priceCheckoutSnapshot(
      userId,
      cartId,
      snapshot,
      manager,
    );
  }

  finalizeCouponAfterOrder(
    userId: string,
    orderId: string,
    priced: PricedCheckoutSnapshot,
    manager: EntityManager,
  ): Promise<void> {
    return this.promotionsApplication.finalizeCouponAfterOrder(
      userId,
      orderId,
      priced,
      manager,
    );
  }
}
