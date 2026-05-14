"use client";

import { useState } from "react";
import Link from "next/link";

import { useAuth } from "@/components/auth/AuthProvider";
import { useCart } from "@/components/cart/CartProvider";
import { addToCart } from "@/lib/cart-api";
import { addGuestCartItem } from "@/lib/guest-cart-api";

type AddToCartButtonProps = {
  productId: string;
  productVariantId?: string;
  /** `compact`: PLP / home cards — add 1 unit, no quantity field. */
  variant?: "default" | "compact";
  /** Extra classes on the compact authenticated submit button. */
  compactTriggerClassName?: string;
  /** Stretch compact controls to full row width (e.g. homepage cards). */
  compactFullWidth?: boolean;
};

function fullWidthClasses(active: boolean | undefined) {
  return active ? "w-full justify-center" : "";
}

export function AddToCartButton({
  productId,
  productVariantId,
  variant = "default",
  compactTriggerClassName,
  compactFullWidth,
}: AddToCartButtonProps) {
  const { isAuthenticated, loading } = useAuth();
  const { refreshCartCount } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const compact = variant === "compact";
  const resolvedVariantId = (productVariantId ?? "").trim();
  const variantReady = resolvedVariantId.length > 0;

  async function onAddToCart() {
    if (!variantReady) {
      setError("Chưa chọn mã hàng (biến thể).");
      return;
    }
    setSubmitting(true);
    setMessage(null);
    setError(null);
    try {
      const qty = compact ? 1 : quantity;
      const successMessage = isAuthenticated
        ? await addToCart(productId, resolvedVariantId, qty)
        : await addGuestCartItem(productId, resolvedVariantId, qty);
      await refreshCartCount();
      setMessage(successMessage);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Không thể thêm vào giỏ hàng.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    if (compact) {
      const fw = fullWidthClasses(compactFullWidth);
      return (
        <span
          className={`inline-flex rounded-full border border-stone-200 px-4 py-2 text-xs text-stone-500 ${fw}`}
        >
          Đang tải...
        </span>
      );
    }
    return <p className="text-xs text-stone-500">Đang kiểm tra tài khoản...</p>;
  }

  if (compact) {
    const fw = fullWidthClasses(compactFullWidth);
    const triggerClass = compactTriggerClassName
      ? `${compactTriggerClassName} ${fw}`.trim()
      : `inline-flex rounded-full bg-stone-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-60 ${fw}`;
    return (
      <div className={`inline-flex max-w-full flex-col gap-1 ${compactFullWidth ? "w-full" : ""}`}>
        <button
          type="button"
          disabled={submitting || !variantReady}
          onClick={() => void onAddToCart()}
          className={triggerClass}
        >
          {submitting ? "Đang thêm..." : "Add to cart"}
        </button>
        {message ? <p className="text-xs text-emerald-600">{message}</p> : null}
        {error ? <p className="whitespace-pre-line text-xs text-rose-600">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {!isAuthenticated ? (
        <p className="text-xs text-stone-600">
          Bạn có thể thêm vào giỏ mà không cần đăng nhập. Đăng nhập sau để đồng bộ giỏ giữa các thiết bị.
        </p>
      ) : null}
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
        disabled={submitting || !variantReady}
        onClick={() => void onAddToCart()}
        className="rounded-full bg-stone-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? "Đang thêm..." : "Add to cart"}
      </button>
      {message ? <p className="text-xs text-emerald-600">{message}</p> : null}
      {error ? <p className="whitespace-pre-line text-xs text-rose-600">{error}</p> : null}
      {!isAuthenticated ? (
        <p className="text-xs text-stone-500">
          Đã có tài khoản?{" "}
          <Link href="/" className="font-semibold text-stone-800 underline-offset-2 hover:underline">
            Đăng nhập
          </Link>
        </p>
      ) : null}
    </div>
  );
}
