"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { AddToCartButton } from "@/components/tenant/extensions/cart/AddToCartButton";
import { WishlistHeartButton } from "@/components/tenant/extensions/wishlist/WishlistHeartButton";
import { PromotionConditionsHint } from "@/components/tenant/extensions/promotions/PromotionConditionsHint";
import type { ProductDetail, ProductListItem } from "@/lib/products-api";
import { buildProductHref, formatVnd, getProductByIdPublic } from "@/lib/products-api";

type ProductGridCardProps = {
  product: ProductListItem;
};

export function ProductGridCard({ product }: ProductGridCardProps) {
  const promo = product.promotion;
  const detailHref = buildProductHref(product);
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
            .filter((v) => (selectedColor ? v.color === selectedColor : false))
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
    if (detail) return;
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
          <button
            type="button"
            onClick={() => void openVariantPicker()}
            className="inline-flex rounded-full bg-stone-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-stone-700"
          >
            Add to cart
          </button>
        </div>
      </div>
      {pickerOpen ? (
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
                      setSelectedColor(event.target.value);
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
                  productVariantId={selectedVariant?.id}
                  variant="compact"
                  compactFullWidth
                />
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </article>
  );
}
