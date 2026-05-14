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

export type CartCacheOwner =
  | { kind: 'user'; userId: string }
  | { kind: 'guest'; sessionId: string };

export function cartCacheStorageKey(owner: CartCacheOwner): string {
  return owner.kind === 'user' ? owner.userId : `guest:${owner.sessionId}`;
}

export interface CartCachePort {
  get(owner: CartCacheOwner): Promise<CartSnapshot | null>;
  set(owner: CartCacheOwner, payload: CartSnapshot): Promise<void>;
  invalidate(owner: CartCacheOwner): Promise<void>;
}

export class InMemoryCartCacheAdapter implements CartCachePort {
  private readonly store = new Map<string, CartSnapshot>();

  get(owner: CartCacheOwner): Promise<CartSnapshot | null> {
    return Promise.resolve(this.store.get(cartCacheStorageKey(owner)) ?? null);
  }

  set(owner: CartCacheOwner, payload: CartSnapshot): Promise<void> {
    this.store.set(cartCacheStorageKey(owner), payload);
    return Promise.resolve();
  }

  invalidate(owner: CartCacheOwner): Promise<void> {
    this.store.delete(cartCacheStorageKey(owner));
    return Promise.resolve();
  }
}
