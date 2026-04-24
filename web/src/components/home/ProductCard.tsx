"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { PromotionConditionsHint } from "@/components/promotions/PromotionConditionsHint";
import { WishlistHeartButton } from "@/components/wishlist/WishlistHeartButton";
import type { ProductPromotionPreview } from "@/lib/products-api";
import { buildProductHref, getProductByIdPublic, type ProductDetail } from "@/lib/products-api";

export type Product = {
  id: string;
  name: string;
  slug?: string;
  price: number;
  originalPrice?: number;
  image: string;
  /** Default catalog variant for quick add-to-cart (PLP / CMS). */
  default_variant_id?: string;
  category?: {
    slug?: string;
    parent?: { slug?: string } | null;
  };
  /** Active catalog campaign preview from API (CMS-driven home sections). */
  promotion?: ProductPromotionPreview;
};

type ProductCardProps = {
  product: Product;
  /** `retail`: wishlist / dense commerce. `editorial`: landing — image-first, info on hover. */
  variant?: "retail" | "editorial";
};

function formatPrice(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

export function ProductCard({ product, variant = "retail" }: ProductCardProps) {
  const promo = product.promotion;
  const detailHref = buildProductHref(product);
  const hasLegacyDiscount = Boolean(
    !promo && product.originalPrice && product.originalPrice > product.price,
  );
  const discountPercent = hasLegacyDiscount
    ? Math.round(
        (((product.originalPrice ?? 0) - product.price) / (product.originalPrice ?? 1)) * 100,
      )
    : 0;
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerError, setPickerError] = useState<string | null>(null);
  const [detail, setDetail] = useState<ProductDetail | null>(null);
  const [selectedColor, setSelectedColor] = useState("");
  const [selectedSize, setSelectedSize] = useState("");

  const detailVariants = useMemo(
    () => (Array.isArray(detail?.variants) ? detail.variants : []),
    [detail],
  );
  const colors = useMemo(
    () => Array.from(new Set(detailVariants.map((v) => v.color).filter(Boolean))),
    [detailVariants],
  );
  const sizes = useMemo(
    () =>
      Array.from(
        new Set(
          detailVariants
            .filter((v) => (selectedColor ? v.color === selectedColor : true))
            .map((v) => v.size)
            .filter(Boolean),
        ),
      ),
    [detailVariants, selectedColor],
  );
  const selectedVariant = useMemo(
    () =>
      detailVariants.find(
        (v) =>
          selectedColor.length > 0 &&
          selectedSize.length > 0 &&
          v.color === selectedColor &&
          v.size === selectedSize,
      ) ?? null,
    [detailVariants, selectedColor, selectedSize],
  );

  async function openVariantPicker() {
    setPickerOpen(true);
    if (detail) {
      return;
    }
    try {
      setPickerLoading(true);
      setPickerError(null);
      const fetched = await getProductByIdPublic(product.id);
      setDetail(fetched);
      setSelectedColor("");
      setSelectedSize("");
    } catch (error) {
      setPickerError(error instanceof Error ? error.message : "Không tải được biến thể sản phẩm.");
    } finally {
      setPickerLoading(false);
    }
  }

  const variantPickerModal = pickerOpen ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4">
      <button
        type="button"
        className="absolute inset-0"
        aria-label="Đóng chọn biến thể"
        onClick={() => setPickerOpen(false)}
      />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-stone-200 bg-white p-5 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-base font-semibold text-stone-900">Chọn màu / size</h4>
          <button
            type="button"
            onClick={() => setPickerOpen(false)}
            className="rounded border border-stone-300 px-2 py-1 text-xs text-stone-700 hover:bg-stone-100"
          >
            Đóng
          </button>
        </div>
        {pickerLoading ? <p className="text-sm text-stone-500">Đang tải biến thể...</p> : null}
        {pickerError ? <p className="text-sm text-rose-600">{pickerError}</p> : null}
        {!pickerLoading && !pickerError ? (
          <div className="space-y-3">
            <label className="block text-xs font-medium text-stone-600">
              Màu
              <select
                value={selectedColor}
                onChange={(event) => {
                  const nextColor = event.target.value;
                  setSelectedColor(nextColor);
                  setSelectedSize("");
                }}
                className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
              >
                <option value="">Chọn màu</option>
                {colors.map((color) => (
                  <option key={color} value={color}>
                    {color}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-medium text-stone-600">
              Size
              <select
                value={selectedSize}
                onChange={(event) => setSelectedSize(event.target.value)}
                disabled={!selectedColor}
                className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
              >
                <option value="">Chọn size</option>
                {sizes.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </label>
            <p className="text-xs text-stone-500">
              {selectedVariant
                ? `Tồn kho: ${selectedVariant.available_stock}`
                : "Vui lòng chọn đầy đủ màu và size."}
            </p>
            <AddToCartButton
              productId={product.id}
              productVariantId={selectedVariant?.id ?? ""}
              variant="compact"
              compactFullWidth
              compactTriggerClassName="inline-flex rounded-full bg-stone-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-60"
            />
            <p className="text-[11px] text-stone-500">
              Không thấy biến thể mong muốn?{" "}
              <Link href={detailHref} className="underline">
                Xem trang chi tiết
              </Link>
              .
            </p>
          </div>
        ) : null}
      </div>
    </div>
  ) : null;

  if (variant === "editorial") {
    return (
      <>
        <article className="group relative isolate overflow-hidden rounded-2xl bg-neutral-200 focus-within:ring-2 focus-within:ring-sevenout-gold focus-within:ring-offset-2 focus-within:ring-offset-sevenout-muted">
          <div className="relative aspect-[3/4] min-h-[280px] w-full sm:min-h-[320px]">
            <Link
              href={detailHref}
              className="absolute inset-0 z-0 outline-none"
              aria-label={`Xem chi tiết: ${product.name}`}
            >
              <Image
                src={product.image}
                alt=""
                fill
                loading="lazy"
                sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                className="object-cover transition duration-500 ease-out group-hover:scale-105 group-hover:brightness-90 group-focus-within:scale-105 group-focus-within:brightness-90"
                role="presentation"
              />
            </Link>
            <div className="pointer-events-none absolute right-2 top-2 z-20 opacity-80 transition group-hover:opacity-100">
              <div className="pointer-events-auto">
                <WishlistHeartButton productId={product.id} />
              </div>
            </div>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-col justify-end bg-gradient-to-t from-sevenout-black/85 via-sevenout-black/40 to-transparent p-4 pt-16 opacity-0 transition duration-300 group-hover:opacity-100 group-focus-within:opacity-100 sm:p-5 sm:pt-20">
              <div className="pointer-events-auto">
                <h3 className="font-sevenout-serif text-lg font-semibold tracking-wide text-sevenout-white sm:text-xl">
                  <Link href={detailHref} className="hover:text-sevenout-gold focus-visible:outline-none">
                    {product.name}
                  </Link>
                </h3>
                {promo ? (
                  <div className="mt-1 flex flex-wrap items-baseline gap-2">
                    <p className="text-xs text-white/50 line-through">{formatPrice(promo.list_price)}</p>
                    <p className="text-sm font-semibold text-sevenout-white">{formatPrice(promo.sale_price)}</p>
                  </div>
                ) : (
                  <div className="mt-1 flex items-baseline gap-2">
                    <p className="text-sm font-semibold text-sevenout-white">{formatPrice(product.price)}</p>
                    {hasLegacyDiscount ? (
                      <p className="text-xs text-white/50 line-through">
                        {formatPrice(product.originalPrice as number)}
                      </p>
                    ) : null}
                  </div>
                )}
                <PromotionConditionsHint
                  display={promo?.conditions_display}
                  className="mt-1 text-[11px] text-white/70 [&_button]:text-white/80"
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void openVariantPicker()}
                    className="inline-flex items-center rounded-full bg-sevenout-white px-4 py-2 text-xs font-semibold text-sevenout-black transition hover:bg-sevenout-gold hover:text-sevenout-black"
                  >
                    Add to cart
                  </button>
                  <Link
                    href={detailHref}
                    className="inline-flex items-center rounded-full border border-white/40 px-4 py-2 text-xs font-semibold text-sevenout-white transition hover:border-sevenout-gold hover:text-sevenout-gold"
                  >
                    Chi tiết
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </article>
        {variantPickerModal}
      </>
    );
  }

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
          <button
            type="button"
            onClick={() => void openVariantPicker()}
            className="inline-flex w-full items-center justify-center rounded-full bg-stone-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-stone-700"
          >
            Add to cart
          </button>
        </div>
      </div>
      {variantPickerModal}
    </article>
  );
}
