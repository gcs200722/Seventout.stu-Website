"use client";

import { useState } from "react";
import Link from "next/link";

import { useAuth } from "@/components/auth/AuthProvider";
import { useCart } from "@/components/cart/CartProvider";
import { addToCart } from "@/lib/cart-api";

type AddToCartButtonProps = {
  productId: string;
};

export function AddToCartButton({ productId }: AddToCartButtonProps) {
  const { isAuthenticated, loading } = useAuth();
  const { refreshCartCount } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onAddToCart() {
    setSubmitting(true);
    setMessage(null);
    setError(null);
    try {
      const successMessage = await addToCart(productId, quantity);
      await refreshCartCount();
      setMessage(successMessage);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Không thể thêm vào giỏ hàng.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <p className="text-xs text-stone-500">Đang kiểm tra tài khoản...</p>;
  }

  if (!isAuthenticated) {
    return (
      <div className="space-y-2">
        <p className="text-xs text-stone-600">Vui lòng đăng nhập để thêm sản phẩm vào giỏ.</p>
        <Link
          href="/"
          className="inline-flex rounded-full border border-stone-300 px-4 py-2 text-xs font-semibold text-stone-700 transition hover:bg-stone-100"
        >
          Đăng nhập
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <label className="text-xs font-semibold uppercase tracking-[0.15em] text-stone-500" htmlFor="quantity">
          Số lượng
        </label>
        <input
          id="quantity"
          type="number"
          min={1}
          value={quantity}
          onChange={(event) => setQuantity(Math.max(1, Number(event.target.value) || 1))}
          className="w-20 rounded-xl border border-stone-300 px-3 py-2 text-sm text-stone-900 outline-none focus:border-stone-800"
        />
      </div>
      <button
        type="button"
        disabled={submitting}
        onClick={() => void onAddToCart()}
        className="rounded-full bg-stone-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? "Đang thêm..." : "Add to cart"}
      </button>
      {message ? <p className="text-xs text-emerald-600">{message}</p> : null}
      {error ? <p className="whitespace-pre-line text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}
