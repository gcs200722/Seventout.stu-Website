import type { EntityManager } from 'typeorm';
import type { CheckoutCartSnapshot } from './order-cart.port';

export const ORDER_PRICING_PORT = Symbol('ORDER_PRICING_PORT');

export type PricedCheckoutSnapshot = CheckoutCartSnapshot & {
  discount_total: number;
  pricing_snapshot: Record<string, unknown>;
  record_coupon_usage: boolean;
  winning_coupon_code: string | null;
  /** Monetary discount attributed to the winning coupon (0 if auto won). */
  coupon_discount_applied: number;
};

export interface OrderPricingPort {
  priceCheckoutSnapshot(
    userId: string,
    cartId: string,
    snapshot: CheckoutCartSnapshot,
    manager?: EntityManager,
  ): Promise<PricedCheckoutSnapshot>;

  finalizeCouponAfterOrder(
    userId: string,
    orderId: string,
    priced: PricedCheckoutSnapshot,
    manager: EntityManager,
  ): Promise<void>;
}
