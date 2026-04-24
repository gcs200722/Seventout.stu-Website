"use client";

import { useMemo, useState } from "react";

import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { ProductDetailWishlist } from "@/components/wishlist/ProductDetailWishlist";
import type { ProductDetail } from "@/lib/products-api";

type ProductPurchasePanelProps = {
  product: ProductDetail;
};

export function ProductPurchasePanel({ product }: ProductPurchasePanelProps) {
  const variants = product.variants ?? [];
  const initialId =
    product.default_variant_id || variants[0]?.id || "";
  const [variantId, setVariantId] = useState(initialId);

  const selected = useMemo(
    () => variants.find((v) => v.id === variantId),
    [variants, variantId],
  );
  const stock = selected?.available_stock ?? 0;

  return (
    <div className="mt-7 space-y-4">
      {variants.length > 1 ? (
        <label className="block text-xs font-semibold uppercase tracking-[0.15em] text-stone-500">
          Màu / cỡ
          <select
            value={variantId}
            onChange={(e) => setVariantId(e.target.value)}
            className="mt-2 w-full max-w-xs rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 outline-none focus:border-stone-800"
          >
            {variants.map((v) => (
              <option key={v.id} value={v.id}>
                {v.color} — {v.size} (còn {v.available_stock})
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <p className="text-sm text-stone-600">
        {stock > 0 ? `Tồn kho (mã đã chọn): ${stock}` : "Tạm hết hàng cho mã này"}
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <AddToCartButton productId={product.id} productVariantId={variantId} />
        <ProductDetailWishlist productId={product.id} />
      </div>
    </div>
  );
}
