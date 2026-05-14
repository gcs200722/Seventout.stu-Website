"use client";

import { Suspense, useCallback, useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

import { formatVnd } from "@/lib/products-api";
import { lookupPublicOrder, type PublicOrderLookupResult } from "@/lib/orders-guest-api";

const LOOKUP_STORAGE_KEY = "guest_order_lookup_secret";

function TrackOrderContent() {
  const searchParams = useSearchParams();
  const initialOrderNumber = useMemo(() => searchParams.get("order_number")?.trim() ?? "", [searchParams]);
  const initialEmail = useMemo(() => searchParams.get("email")?.trim() ?? "", [searchParams]);

  const [orderNumber, setOrderNumber] = useState(initialOrderNumber);
  const [email, setEmail] = useState(initialEmail);
  const [lookupSecret, setLookupSecret] = useState(() => {
    if (typeof window === "undefined") return "";
    return sessionStorage.getItem(LOOKUP_STORAGE_KEY)?.trim() ?? "";
  });
  const [result, setResult] = useState<PublicOrderLookupResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = useCallback(
    async (event: FormEvent) => {
      event.preventDefault();
      setLoading(true);
      setError(null);
      setResult(null);
      try {
        const data = await lookupPublicOrder({
          order_number: orderNumber.trim(),
          email: email.trim(),
          lookup_secret: lookupSecret.trim(),
        });
        setResult(data);
        if (typeof window !== "undefined") {
          sessionStorage.removeItem(LOOKUP_STORAGE_KEY);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Tra cứu thất bại.");
      } finally {
        setLoading(false);
      }
    },
    [orderNumber, email, lookupSecret],
  );

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-semibold text-stone-900">Tra cứu đơn hàng</h1>
      <p className="mt-1 text-sm text-stone-600">
        Nhập mã đơn, email và mã tra cứu (được hiển thị một lần sau khi đặt hàng).
      </p>

      <form onSubmit={(e) => void onSubmit(e)} className="mt-6 space-y-3">
        <label className="block text-xs font-medium text-stone-700">
          Mã đơn hàng
          <input
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
            required
          />
        </label>
        <label className="block text-xs font-medium text-stone-700">
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
            required
          />
        </label>
        <label className="block text-xs font-medium text-stone-700">
          Mã tra cứu
          <input
            value={lookupSecret}
            onChange={(e) => setLookupSecret(e.target.value)}
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
            required
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="rounded-full bg-stone-900 px-5 py-2 text-sm font-semibold text-white hover:bg-stone-700 disabled:opacity-60"
        >
          {loading ? "Đang tra cứu..." : "Tra cứu"}
        </button>
      </form>

      {error ? <p className="mt-4 text-sm text-rose-600">{error}</p> : null}

      {result ? (
        <div className="mt-6 rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-800">
          <p className="font-semibold">Đơn {result.order_number}</p>
          <p className="mt-1">Trạng thái: {result.status}</p>
          <p>Thanh toán: {result.payment_status}</p>
          <p className="mt-1 font-semibold">Tổng: {formatVnd(result.total_amount)}</p>
          <ul className="mt-2 list-inside list-disc text-xs">
            {result.items.map((row) => (
              <li key={`${row.product_name}-${row.quantity}`}>
                {row.product_name} × {row.quantity} — {formatVnd(row.subtotal)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="mt-6 text-xs text-stone-500">
        <Link href="/cart" className="font-semibold text-stone-800 underline-offset-2 hover:underline">
          Về giỏ hàng
        </Link>
      </p>
    </div>
  );
}

export default function TrackOrderPage() {
  return (
    <Suspense fallback={<p className="px-4 py-10 text-sm text-stone-600">Đang tải...</p>}>
      <TrackOrderContent />
    </Suspense>
  );
}
