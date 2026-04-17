"use client";

import { useState } from "react";
import Link from "next/link";

import { useAuth } from "@/components/auth/AuthProvider";
import { useCart } from "@/components/cart/CartProvider";
import { addToCart } from "@/lib/cart-api";
import type { ProductListItem } from "@/lib/products-api";
import { formatVnd } from "@/lib/products-api";

type ProductGridCardProps = {
  product: ProductListItem;
};

export function ProductGridCard({ product }: ProductGridCardProps) {
  const { isAuthenticated, loading } = useAuth();
  const { refreshCartCount } = useCart();
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAddToCart() {
    setAdding(true);
    setMessage(null);
    setError(null);
    try {
      const successMessage = await addToCart(product.id, 1);
      await refreshCartCount();
      setMessage(successMessage);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Không thể thêm vào giỏ hàng.");
    } finally {
      setAdding(false);
    }
  }

  return (
    <article className="group overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
      <div className="relative aspect-[4/5] overflow-hidden bg-stone-100">
        {/* eslint-disable-next-line @next/next/no-img-element -- Presigned URL dynamic host */}
        <img
          src={product.thumbnail}
          alt={product.name}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
        />
      </div>

      <div className="space-y-2 p-4">
        <p className="text-xs uppercase tracking-[0.15em] text-stone-500">{product.category.name}</p>
        <h3 className="line-clamp-2 text-sm font-semibold text-stone-900">{product.name}</h3>
        <p className="text-base font-bold text-stone-900">{formatVnd(product.price)}</p>
        <p className="text-xs text-stone-600">
          {product.available_stock > 0 ? `Còn ${product.available_stock} sản phẩm` : "Hết hàng"}
        </p>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/products/${product.id}`}
            className="inline-flex rounded-full border border-stone-300 px-4 py-2 text-xs font-semibold text-stone-800 transition hover:bg-stone-900 hover:text-white"
          >
            Xem chi tiết
          </Link>
          {loading ? (
            <span className="inline-flex rounded-full border border-stone-200 px-4 py-2 text-xs text-stone-500">
              Đang tải...
            </span>
          ) : isAuthenticated ? (
            <button
              type="button"
              disabled={adding}
              onClick={() => void handleAddToCart()}
              className="inline-flex rounded-full bg-stone-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {adding ? "Đang thêm..." : "Add to cart"}
            </button>
          ) : (
            <Link
              href="/"
              className="inline-flex rounded-full border border-stone-300 px-4 py-2 text-xs font-semibold text-stone-700 transition hover:bg-stone-100"
            >
              Đăng nhập
            </Link>
          )}
        </div>
        {message ? <p className="text-xs text-emerald-600">{message}</p> : null}
        {error ? <p className="whitespace-pre-line text-xs text-rose-600">{error}</p> : null}
      </div>
    </article>
  );
}
