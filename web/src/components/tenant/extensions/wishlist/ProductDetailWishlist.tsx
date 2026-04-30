"use client";

import { WishlistHeartButton } from "@/components/tenant/extensions/wishlist/WishlistHeartButton";

type ProductDetailWishlistProps = {
  productId: string;
};

export function ProductDetailWishlist({ productId }: ProductDetailWishlistProps) {
  return <WishlistHeartButton productId={productId} variant="detail" />;
}
