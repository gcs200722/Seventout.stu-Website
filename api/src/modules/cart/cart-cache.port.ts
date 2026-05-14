export const CART_CACHE_PORT = Symbol('CART_CACHE_PORT');

export type CartSnapshot = {
  cart_id: string;
  items: Array<{
    item_id: string;
    product_id: string;
    product_variant_id: string;
    variant_color: string;
    variant_size: string;
    product_name: string;
    price: number;
    quantity: number;
    available_stock: number;
    subtotal: number;
  }>;
  total_amount: number;
  total_items: number;
};

export interface CartCachePort {
  get(userId: string): Promise<CartSnapshot | null>;
  set(userId: string, payload: CartSnapshot): Promise<void>;
  invalidate(userId: string): Promise<void>;
}

export class InMemoryCartCacheAdapter implements CartCachePort {
  private readonly store = new Map<string, CartSnapshot>();

  get(userId: string): Promise<CartSnapshot | null> {
    return Promise.resolve(this.store.get(userId) ?? null);
  }

  set(userId: string, payload: CartSnapshot): Promise<void> {
    this.store.set(userId, payload);
    return Promise.resolve();
  }

  invalidate(userId: string): Promise<void> {
    this.store.delete(userId);
    return Promise.resolve();
  }
}
