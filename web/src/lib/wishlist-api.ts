import { withAuth } from "@/lib/http-client";
import type { ProductPromotionPreview } from "@/lib/products-api";

export type WishlistListItem = {
  product_id: string;
  product_name: string;
  price: number;
  image: string;
  promotion?: ProductPromotionPreview;
};

export type WishlistListPayload = {
  items: WishlistListItem[];
};

export async function getWishlist(page = 1, limit = 100): Promise<{
  items: WishlistListItem[];
  pagination: { page: number; limit: number; total: number };
}> {
  const search = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  const envelope = await withAuth<WishlistListPayload>(`/wishlist?${search.toString()}`);
  if (!envelope.data) {
    throw new Error("Unexpected API response format");
  }
  return {
    items: envelope.data.items,
    pagination: envelope.pagination ?? { page, limit, total: envelope.data.items.length },
  };
}

/** Lightweight count for header badge (uses pagination total, minimal page size). */
export async function getWishlistItemCount(): Promise<number> {
  const { pagination } = await getWishlist(1, 1);
  return pagination.total;
}

export async function addToWishlist(productId: string): Promise<string> {
  const envelope = await withAuth<unknown>("/wishlist", {
    method: "POST",
    body: JSON.stringify({ product_id: productId }),
  });
  return envelope.message ?? "Đã thêm vào yêu thích.";
}

export async function removeFromWishlist(productId: string): Promise<string> {
  const envelope = await withAuth<unknown>(`/wishlist/${productId}`, {
    method: "DELETE",
  });
  return envelope.message ?? "Đã bỏ khỏi yêu thích.";
}

export async function checkWishlistFavorite(productId: string): Promise<boolean> {
  const envelope = await withAuth<{ is_favorite: boolean }>(
    `/wishlist/check/${productId}`,
  );
  if (!envelope.data) {
    throw new Error("Unexpected API response format");
  }
  return envelope.data.is_favorite;
}
