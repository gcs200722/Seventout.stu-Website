"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useAuth } from "@/components/auth/AuthProvider";
import { useCart } from "@/components/cart/CartProvider";
import {
  clearMyCart,
  getMyCart,
  removeCartItem,
  updateCartItem,
  validateMyCart,
  type CartSnapshot,
} from "@/lib/cart-api";
import { createMyOrder } from "@/lib/orders-api";
import { formatVnd } from "@/lib/products-api";

export default function CartPage() {
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();
  const { refreshCartCount } = useCart();
  const [cart, setCart] = useState<CartSnapshot | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [addressLine, setAddressLine] = useState("");
  const [ward, setWard] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("Vietnam");
  const [note, setNote] = useState("");

  const reloadCart = useCallback(async () => {
    if (!isAuthenticated) {
      setCart(null);
      setPageLoading(false);
      return;
    }
    setPageLoading(true);
    setError(null);
    try {
      const snapshot = await getMyCart();
      setCart(snapshot);
      await refreshCartCount();
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Không tải được giỏ hàng.");
    } finally {
      setPageLoading(false);
    }
  }, [isAuthenticated, refreshCartCount]);

  useEffect(() => {
    void reloadCart();
  }, [reloadCart]);

  const canCheckout = useMemo(() => Boolean(cart && cart.items.length > 0), [cart]);

  async function handleUpdateItem(itemId: string, quantity: number) {
    setPendingId(itemId);
    setError(null);
    setSuccess(null);
    try {
      await updateCartItem(itemId, quantity);
      await reloadCart();
      setSuccess("Đã cập nhật số lượng.");
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Không thể cập nhật sản phẩm.");
    } finally {
      setPendingId(null);
    }
  }

  async function handleRemoveItem(itemId: string) {
    setPendingId(itemId);
    setError(null);
    setSuccess(null);
    try {
      await removeCartItem(itemId);
      await reloadCart();
      setSuccess("Đã xóa sản phẩm khỏi giỏ.");
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Không thể xóa sản phẩm.");
    } finally {
      setPendingId(null);
    }
  }

  async function handleClearCart() {
    setPendingId("clear");
    setError(null);
    setSuccess(null);
    try {
      await clearMyCart();
      await reloadCart();
      setSuccess("Đã xóa toàn bộ giỏ hàng.");
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Không thể xóa giỏ hàng.");
    } finally {
      setPendingId(null);
    }
  }

  async function handleValidate() {
    setPendingId("validate");
    setError(null);
    setSuccess(null);
    try {
      const result = await validateMyCart();
      if (result.valid) {
        setSuccess("Giỏ hàng hợp lệ, sẵn sàng checkout.");
      } else {
        const messages = result.issues.map((issue) => `- ${issue.code}: ${issue.message}`).join("\n");
        setError(`Giỏ hàng chưa hợp lệ:\n${messages}`);
      }
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Không thể validate giỏ hàng.");
    } finally {
      setPendingId(null);
    }
  }

  async function handleCheckout() {
    setPendingId("checkout");
    setError(null);
    setSuccess(null);
    if (!cart) {
      setPendingId(null);
      return;
    }
    if (!addressLine.trim() || !ward.trim() || !city.trim() || !country.trim()) {
      setError("Vui lòng nhập đầy đủ địa chỉ giao hàng.");
      setPendingId(null);
      return;
    }
    try {
      const idempotencyKey = `web-${Date.now()}`;
      const result = await createMyOrder(
        {
          cart_id: cart.cart_id,
          shipping_address: {
            address_line: addressLine.trim(),
            ward: ward.trim(),
            city: city.trim(),
            country: country.trim(),
          },
          note: note.trim() || undefined,
        },
        idempotencyKey,
      );
      setSuccess("Tạo đơn hàng thành công. Đang chuyển tới chi tiết đơn...");
      router.push(`/orders/${result.order_id}`);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Checkout thất bại.");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-semibold text-stone-900">Giỏ hàng</h1>
        <p className="mt-1 text-sm text-stone-600">Xem lại sản phẩm trước khi checkout.</p>

        {loading || pageLoading ? <p className="mt-4 text-sm text-stone-500">Đang tải giỏ hàng...</p> : null}

        {!loading && !isAuthenticated ? (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
            Vui lòng đăng nhập để xem giỏ hàng.
            <div className="mt-3">
              <Link
                href="/"
                className="inline-flex rounded-full border border-amber-300 px-3 py-1.5 text-xs font-semibold hover:bg-amber-100"
              >
                Về trang chủ để đăng nhập
              </Link>
            </div>
          </div>
        ) : null}

        {!loading && isAuthenticated && cart && cart.items.length === 0 ? (
          <div className="mt-4 rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-600">
            Giỏ hàng của bạn đang trống.
          </div>
        ) : null}

        {!loading && isAuthenticated && cart && cart.items.length > 0 ? (
          <div className="mt-5 space-y-3">
            {cart.items.map((item) => (
              <article
                key={item.item_id}
                className="rounded-xl border border-stone-200 bg-stone-50 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold text-stone-900">{item.product_name}</h2>
                    <p className="mt-1 text-xs text-stone-500">
                      Giá: {formatVnd(item.price)} | Tồn kho: {item.available_stock}
                    </p>
                    <p className="mt-1 text-xs text-stone-700">Tạm tính: {formatVnd(item.subtotal)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      defaultValue={item.quantity}
                      disabled={pendingId === item.item_id}
                      onBlur={(event) => {
                        const nextQty = Math.max(1, Number(event.target.value) || 1);
                        if (nextQty !== item.quantity) {
                          void handleUpdateItem(item.item_id, nextQty);
                        }
                      }}
                      className="w-20 rounded-lg border border-stone-300 px-2 py-1.5 text-sm text-stone-900 outline-none focus:border-stone-800"
                    />
                    <button
                      type="button"
                      disabled={pendingId === item.item_id}
                      onClick={() => void handleRemoveItem(item.item_id)}
                      className="rounded-full border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Xóa
                    </button>
                  </div>
                </div>
              </article>
            ))}

            <div className="rounded-xl border border-stone-200 bg-white p-4">
              <p className="text-sm text-stone-700">Tổng sản phẩm: {cart.total_items}</p>
              <p className="mt-1 text-lg font-semibold text-stone-900">Tổng tiền: {formatVnd(cart.total_amount)}</p>
              <div className="mt-4 space-y-3">
                <label className="block text-xs font-medium text-stone-700">
                  Địa chỉ (address_line)
                  <input
                    value={addressLine}
                    onChange={(event) => setAddressLine(event.target.value)}
                    placeholder="123 ABC Street"
                    className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 outline-none focus:border-stone-800"
                  />
                </label>
                <div className="grid gap-3 sm:grid-cols-3">
                  <label className="block text-xs font-medium text-stone-700">
                    Ward
                    <input
                      value={ward}
                      onChange={(event) => setWard(event.target.value)}
                      placeholder="Ward 5"
                      className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 outline-none focus:border-stone-800"
                    />
                  </label>
                  <label className="block text-xs font-medium text-stone-700">
                    City
                    <input
                      value={city}
                      onChange={(event) => setCity(event.target.value)}
                      placeholder="Ho Chi Minh"
                      className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 outline-none focus:border-stone-800"
                    />
                  </label>
                  <label className="block text-xs font-medium text-stone-700">
                    Country
                    <input
                      value={country}
                      onChange={(event) => setCountry(event.target.value)}
                      placeholder="Vietnam"
                      className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 outline-none focus:border-stone-800"
                    />
                  </label>
                </div>
                <label className="block text-xs font-medium text-stone-700">
                  Ghi chú (tuỳ chọn)
                  <input
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="Ví dụ: Giao giờ hành chính"
                    className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 outline-none focus:border-stone-800"
                  />
                </label>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={pendingId !== null}
                  onClick={() => void handleValidate()}
                  className="rounded-full border border-stone-300 px-4 py-2 text-xs font-semibold text-stone-700 transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Validate cart
                </button>
                <button
                  type="button"
                  disabled={pendingId !== null}
                  onClick={() => void handleClearCart()}
                  className="rounded-full border border-rose-300 px-4 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Clear cart
                </button>
                <button
                  type="button"
                  disabled={!canCheckout || pendingId !== null}
                  onClick={() => void handleCheckout()}
                  className="rounded-full bg-stone-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Tạo đơn hàng
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {error ? <p className="mt-3 whitespace-pre-line text-xs text-rose-600">{error}</p> : null}
        {success ? <p className="mt-3 text-xs text-emerald-600">{success}</p> : null}
      </section>
    </div>
  );
}
