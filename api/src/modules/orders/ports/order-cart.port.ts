import type { EntityManager } from 'typeorm';

export const ORDER_CART_PORT = Symbol('ORDER_CART_PORT');

export type OrderCartOwner =
  | { type: 'user'; userId: string }
  | { type: 'guest'; sessionId: string };

export type CheckoutCartItem = {
  product_id: string;
  product_variant_id: string;
  variant_color: string;
  variant_size: string;
  product_name: string;
  price: number;
  quantity: number;
  subtotal: number;
};

export type CheckoutCartSnapshot = {
  cart_id: string;
  applied_coupon_id: string | null;
  items: CheckoutCartItem[];
  /** Sum of line subtotals before promotions. */
  subtotal_amount: number;
  /** Payable total; equals subtotal until pricing adjusts. */
  total_amount: number;
};

export interface OrderCartPort {
  getCheckoutCart(
    owner: OrderCartOwner,
    cartId: string,
    manager?: EntityManager,
  ): Promise<CheckoutCartSnapshot>;
  clearCartAfterCheckout(owner: OrderCartOwner, cartId: string): Promise<void>;
}
