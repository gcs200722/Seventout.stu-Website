import type { EntityManager } from 'typeorm';

export const ORDER_CART_PORT = Symbol('ORDER_CART_PORT');

export type CheckoutCartItem = {
  product_id: string;
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
    userId: string,
    cartId: string,
    manager?: EntityManager,
  ): Promise<CheckoutCartSnapshot>;
  clearCartAfterCheckout(userId: string, cartId: string): Promise<void>;
}
