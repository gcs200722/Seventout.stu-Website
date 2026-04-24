import { withAuth } from "@/lib/http-client";

export type CartItem = {
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
};

export type CartSnapshot = {
  cart_id: string;
  items: CartItem[];
  total_amount: number;
  total_items: number;
};

export type CartValidationResult = {
  valid: boolean;
  issues: Array<{
    code: "OUT_OF_STOCK" | "PRICE_CHANGED" | "PRODUCT_UNAVAILABLE";
    product_id: string;
    message: string;
  }>;
};

export async function getMyCart(): Promise<CartSnapshot> {
  const envelope = await withAuth<CartSnapshot>("/cart");
  if (!envelope.data) {
    throw new Error("Unexpected API response format");
  }
  return envelope.data;
}

export async function addToCart(productId: string, productVariantId: string, quantity: number) {
  const envelope = await withAuth<unknown>("/cart/items", {
    method: "POST",
    body: JSON.stringify({
      product_id: productId,
      product_variant_id: productVariantId,
      quantity,
    }),
  });
  return envelope.message ?? "Cart item added successfully";
}

export async function updateCartItem(
  itemId: string,
  quantity: number,
  productVariantId?: string,
) {
  const envelope = await withAuth<unknown>(`/cart/items/${itemId}`, {
    method: "PATCH",
    body: JSON.stringify({
      quantity,
      product_variant_id: productVariantId,
    }),
  });
  return envelope.message ?? "Cart item updated successfully";
}

export async function removeCartItem(itemId: string) {
  const envelope = await withAuth<unknown>(`/cart/items/${itemId}`, {
    method: "DELETE",
  });
  return envelope.message ?? "Cart item removed successfully";
}

export async function clearMyCart() {
  const envelope = await withAuth<unknown>("/cart/clear", { method: "DELETE" });
  return envelope.message ?? "Cart cleared successfully";
}

export async function validateMyCart(): Promise<CartValidationResult> {
  const envelope = await withAuth<CartValidationResult>("/cart/validate", {
    method: "POST",
  });
  if (!envelope.data) {
    throw new Error("Unexpected API response format");
  }
  return envelope.data;
}
