"use client";

import { WishlistHeartButton } from "@/components/wishlist/WishlistHeartButton";

type ProductDetailWishlistProps = {
  productId: string;
};

export function ProductDetailWishlist({ productId }: ProductDetailWishlistProps) {
  return <WishlistHeartButton productId={productId} variant="detail" />;
}
