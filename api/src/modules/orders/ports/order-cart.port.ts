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
  items: CheckoutCartItem[];
  total_amount: number;
};

export interface OrderCartPort {
  getCheckoutCart(
    userId: string,
    cartId: string,
  ): Promise<CheckoutCartSnapshot>;
  clearCartAfterCheckout(userId: string, cartId: string): Promise<void>;
}
