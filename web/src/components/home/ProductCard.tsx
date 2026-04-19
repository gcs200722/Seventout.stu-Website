"use client";

import Image from "next/image";
import Link from "next/link";

import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { PromotionConditionsHint } from "@/components/promotions/PromotionConditionsHint";
import { WishlistHeartButton } from "@/components/wishlist/WishlistHeartButton";
import type { ProductPromotionPreview } from "@/lib/products-api";

export type Product = {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  /** Active catalog campaign preview from API (CMS-driven home sections). */
  promotion?: ProductPromotionPreview;
};

type ProductCardProps = {
  product: Product;
};

function formatPrice(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

export function ProductCard({ product }: ProductCardProps) {
  const promo = product.promotion;
  const detailHref = `/products/${product.id}`;
  const hasLegacyDiscount = Boolean(
    !promo && product.originalPrice && product.originalPrice > product.price,
  );
  const discountPercent = hasLegacyDiscount
    ? Math.round(
        (((product.originalPrice ?? 0) - product.price) / (product.originalPrice ?? 1)) * 100,
      )
    : 0;

  return (
    <article className="group animate-fade-in overflow-hidden rounded-2xl bg-white p-3 shadow-sm ring-1 ring-stone-200 transition duration-300 hover:-translate-y-1 hover:shadow-xl">
      <div className="relative mb-4">
        <Link
          href={detailHref}
          className="relative block h-64 w-full overflow-hidden rounded-xl bg-stone-100 outline-none focus-visible:ring-2 focus-visible:ring-stone-900 focus-visible:ring-offset-2"
          aria-label={`Xem chi tiết: ${product.name}`}
        >
          <Image
            src={product.image}
            alt=""
            fill
            loading="lazy"
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
            className="object-cover transition duration-500 group-hover:scale-105"
            role="presentation"
          />
          {promo?.campaign_name ? (
            <span className="pointer-events-none absolute left-2 top-2 z-10 max-w-[calc(100%-1rem)] truncate rounded-md bg-red-600 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm">
              {promo.campaign_name}
            </span>
          ) : hasLegacyDiscount ? (
            <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-rose-600 px-2.5 py-1 text-xs font-semibold text-white">
              -{discountPercent}%
            </span>
          ) : null}
        </Link>
        <div className="absolute right-2 top-2 z-20">
          <WishlistHeartButton productId={product.id} />
        </div>
      </div>
      <div className="space-y-2 px-1 pb-1">
        <h3 className="line-clamp-2 text-sm font-semibold text-stone-900 sm:text-base">
          <Link
            href={detailHref}
            className="text-stone-900 transition hover:text-stone-600 hover:underline hover:decoration-stone-400 hover:underline-offset-2"
          >
            {product.name}
          </Link>
        </h3>
        {promo ? (
          <div className="flex flex-wrap items-baseline gap-2">
            <p className="text-sm font-medium text-stone-400 line-through">{formatPrice(promo.list_price)}</p>
            <p className="text-base font-bold text-stone-900">{formatPrice(promo.sale_price)}</p>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <p className="text-base font-bold text-stone-900">{formatPrice(product.price)}</p>
            {hasLegacyDiscount ? (
              <p className="text-xs text-stone-500 line-through">{formatPrice(product.originalPrice as number)}</p>
            ) : null}
          </div>
        )}
        <PromotionConditionsHint display={promo?.conditions_display} />
        <div className="mt-2">
          <AddToCartButton
            productId={product.id}
            variant="compact"
            compactFullWidth
            compactTriggerClassName="inline-flex rounded-full bg-stone-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-60"
          />
        </div>
      </div>
    </article>
  );
}
