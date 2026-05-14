"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { getMyCart, type CartSnapshot } from "@/lib/cart-api";
import { getGuestCart } from "@/lib/guest-cart-api";
import { formatVnd } from "@/lib/products-api";

type MiniCartPreviewProps = {
  open: boolean;
  isAuthenticated: boolean;
};

export function MiniCartPreview({ open, isAuthenticated }: MiniCartPreviewProps) {
  const [cart, setCart] = useState<CartSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const load = isAuthenticated ? getMyCart() : getGuestCart();
    void load
      .then((snapshot) => setCart(snapshot))
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : "Cannot load cart.");
        setCart(null);
      });
  }, [isAuthenticated, open]);

  const items = useMemo(() => (cart ? cart.items.slice(0, 3) : []), [cart]);
  const loading = open && !cart && !error;

  if (!open) return null;

  return (
    <aside className="absolute right-0 top-[calc(100%+12px)] z-50 w-[min(92vw,360px)] rounded-2xl border border-stone-200 bg-white p-4 shadow-2xl">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-stone-900">Mini cart</p>
        <Link href="/cart" className="text-xs font-semibold text-stone-600 transition hover:text-stone-900">
          View cart
        </Link>
      </div>

      {loading ? (
        <p className="mt-3 text-sm text-stone-600">Loading cart...</p>
      ) : error ? (
        <p className="mt-3 text-sm text-rose-600">{error}</p>
      ) : !cart || cart.items.length === 0 ? (
        <p className="mt-3 text-sm text-stone-600">Your cart is empty.</p>
      ) : (
        <>
          {!isAuthenticated ? (
            <p className="mt-2 text-xs text-stone-500">Guest cart — sign in to sync across devices.</p>
          ) : null}
          <ul className="mt-3 space-y-2">
            {items.map((item) => (
              <li key={item.item_id} className="rounded-lg border border-stone-200 px-3 py-2">
                <p className="line-clamp-1 text-sm font-medium text-stone-900">{item.product_name}</p>
                {item.variant_color || item.variant_size ? (
                  <p className="mt-0.5 text-xs text-stone-500">
                    {item.variant_color} · {item.variant_size}
                  </p>
                ) : null}
                <p className="mt-0.5 text-xs text-stone-500">
                  Qty {item.quantity} x {formatVnd(item.price)}
                </p>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm font-semibold text-stone-900">Total: {formatVnd(cart.total_amount)}</p>
          <div className="mt-3 flex gap-2">
            <Link
              href="/cart"
              className="inline-flex rounded-full border border-stone-300 px-4 py-2 text-xs font-semibold text-stone-700 transition hover:bg-stone-100"
            >
              Edit cart
            </Link>
            <Link
              href="/cart"
              className="inline-flex rounded-full bg-stone-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-stone-700"
            >
              Checkout
            </Link>
          </div>
        </>
      )}
    </aside>
  );
}
