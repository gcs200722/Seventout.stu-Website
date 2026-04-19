"use client";

import Link from "next/link";

import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { WishlistHeartButton } from "@/components/wishlist/WishlistHeartButton";
import { PromotionConditionsHint } from "@/components/promotions/PromotionConditionsHint";
import type { ProductListItem } from "@/lib/products-api";
import { formatVnd } from "@/lib/products-api";

type ProductGridCardProps = {
  product: ProductListItem;
};

export function ProductGridCard({ product }: ProductGridCardProps) {
  const promo = product.promotion;
  const detailHref = `/products/${product.id}`;

  return (
    <article className="group overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
      <div className="relative">
        <Link
          href={detailHref}
          className="relative block aspect-[4/5] overflow-hidden bg-stone-100 outline-none focus-visible:ring-2 focus-visible:ring-stone-900 focus-visible:ring-offset-2"
          aria-label={`Xem chi tiết: ${product.name}`}
        >
          {promo?.campaign_name ? (
            <span className="pointer-events-none absolute left-2 top-2 z-10 max-w-[calc(100%-1rem)] truncate rounded-md bg-red-600 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm">
              {promo.campaign_name}
            </span>
          ) : null}
          {/* eslint-disable-next-line @next/next/no-img-element -- Presigned URL dynamic host */}
          <img
            src={product.thumbnail}
            alt=""
            role="presentation"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        </Link>
        <div className="absolute right-2 top-2 z-20">
          <WishlistHeartButton productId={product.id} />
        </div>
      </div>

      <div className="space-y-2 p-4">
        <p className="text-xs uppercase tracking-[0.15em] text-stone-500">{product.category.name}</p>
        <h3 className="line-clamp-2 text-sm font-semibold text-stone-900">
          <Link
            href={detailHref}
            className="text-stone-900 transition hover:text-stone-600 hover:underline hover:decoration-stone-400 hover:underline-offset-2"
          >
            {product.name}
          </Link>
        </h3>
        {promo ? (
          <p className="flex flex-wrap items-baseline gap-2 text-base">
            <span className="text-sm font-medium text-stone-400 line-through">{formatVnd(promo.list_price)}</span>
            <span className="font-bold text-stone-900">{formatVnd(promo.sale_price)}</span>
          </p>
        ) : (
          <p className="text-base font-bold text-stone-900">{formatVnd(product.price)}</p>
        )}
        <PromotionConditionsHint display={promo?.conditions_display} />
        <p className="text-xs text-stone-600">
          {product.available_stock > 0 ? `Còn ${product.available_stock} sản phẩm` : "Hết hàng"}
        </p>
        <div className="flex flex-wrap items-start gap-2">
          <Link
            href={detailHref}
            className="inline-flex rounded-full border border-stone-300 px-4 py-2 text-xs font-semibold text-stone-800 transition hover:bg-stone-900 hover:text-white"
          >
            Xem chi tiết
          </Link>
          <AddToCartButton productId={product.id} variant="compact" />
        </div>
      </div>
    </article>
  );
}
