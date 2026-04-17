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
import { listMyAddresses, type AddressItem } from "@/lib/addresses-api";
import { createMyOrder } from "@/lib/orders-api";
import { createMyPayment } from "@/lib/payments-api";
import type { PaymentMethod } from "@/lib/payments-api";
import { formatVnd } from "@/lib/products-api";

export default function CartPage() {
  const router = useRouter();
  const { user, isAuthenticated, loading } = useAuth();
  const { refreshCartCount } = useCart();
  const [cart, setCart] = useState<CartSnapshot | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [addresses, setAddresses] = useState<AddressItem[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>("");
  const [note, setNote] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("COD");

  const paymentOptions: Array<{
    value: PaymentMethod;
    label: string;
    description: string;
    enabled: boolean;
  }> = [
    {
      value: "COD",
      label: "Thanh toán khi nhận hàng (COD)",
      description: "Tạo đơn ngay, thanh toán khi giao hàng.",
      enabled: true,
    },
    {
      value: "VNPAY",
      label: "VNPay",
      description: "Sắp ra mắt trong giai đoạn tiếp theo.",
      enabled: false,
    },
    {
      value: "STRIPE",
      label: "Stripe",
      description: "Sắp ra mắt trong giai đoạn tiếp theo.",
      enabled: false,
    },
  ];

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
      const addressItems = await listMyAddresses(user?.id);
      setAddresses(addressItems);
      const defaultAddress = addressItems.find((item) => item.is_default);
      setSelectedAddressId((current) => current || defaultAddress?.id || addressItems[0]?.id || "");
      await refreshCartCount();
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Không tải được giỏ hàng.");
    } finally {
      setPageLoading(false);
    }
  }, [isAuthenticated, refreshCartCount, user?.id]);

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
    if (!selectedAddressId) {
      setError("Vui lòng chọn địa chỉ giao hàng trước khi checkout.");
      setPendingId(null);
      return;
    }
    try {
      const idempotencyKey = `web-${Date.now()}`;
      const orderResult = await createMyOrder(
        {
          cart_id: cart.cart_id,
          address_id: selectedAddressId,
          note: note.trim() || undefined,
        },
        idempotencyKey,
      );
      const paymentResult = await createMyPayment(
        {
          order_id: orderResult.order_id,
          payment_method: paymentMethod,
        },
        `${idempotencyKey}-payment`,
      );
      setCart({
        cart_id: cart.cart_id,
        items: [],
        total_amount: 0,
        total_items: 0,
      });
      await refreshCartCount();
      setSuccess(`Tạo đơn hàng và khởi tạo thanh toán ${paymentMethod} thành công.`);
      router.push(`/orders/${orderResult.order_id}?payment_status=${paymentResult.status}`);
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
                <fieldset className="rounded-xl border border-stone-200 bg-stone-50 p-3">
                  <legend className="px-1 text-xs font-semibold text-stone-800">Địa chỉ giao hàng</legend>
                  {addresses.length === 0 ? (
                    <div className="space-y-2 text-xs text-stone-600">
                      <p>Bạn chưa có địa chỉ nào để checkout.</p>
                      <Link
                        href="/profile"
                        className="inline-flex rounded-full border border-stone-300 px-3 py-1.5 font-semibold text-stone-700 hover:bg-stone-100"
                      >
                        Đi đến quản lý địa chỉ
                      </Link>
                    </div>
                  ) : (
                    <div className="mt-2 space-y-2">
                      {addresses.map((address) => (
                        <label
                          key={address.id}
                          className={`flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 ${
                            selectedAddressId === address.id
                              ? "border-stone-900 bg-white"
                              : "border-stone-200 bg-white hover:border-stone-400"
                          }`}
                        >
                          <input
                            type="radio"
                            name="shipping_address_id"
                            value={address.id}
                            checked={selectedAddressId === address.id}
                            disabled={pendingId !== null}
                            onChange={() => setSelectedAddressId(address.id)}
                            className="mt-0.5 h-4 w-4 accent-stone-900"
                          />
                          <span className="text-xs text-stone-700">
                            <span className="block font-semibold text-stone-900">
                              {address.full_name} ({address.phone}){" "}
                              {address.is_default ? (
                                <span className="rounded-full border border-stone-300 px-2 py-0.5 text-[10px] font-semibold">
                                  Mặc định
                                </span>
                              ) : null}
                            </span>
                            <span className="block">
                              {address.address_line}, {address.ward}, {address.city}, {address.country}
                            </span>
                          </span>
                        </label>
                      ))}
                      <Link
                        href="/profile"
                        className="inline-flex rounded-full border border-stone-300 px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-100"
                      >
                        Quản lý địa chỉ
                      </Link>
                    </div>
                  )}
                </fieldset>
                <label className="block text-xs font-medium text-stone-700">
                  Ghi chú (tuỳ chọn)
                  <input
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="Ví dụ: Giao giờ hành chính"
                    className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 outline-none focus:border-stone-800"
                  />
                </label>
                <fieldset className="rounded-xl border border-stone-200 bg-stone-50 p-3">
                  <legend className="px-1 text-xs font-semibold text-stone-800">
                    Phương thức thanh toán
                  </legend>
                  <div className="mt-2 space-y-2">
                    {paymentOptions.map((option) => (
                      <label
                        key={option.value}
                        className={`flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 ${
                          paymentMethod === option.value
                            ? "border-stone-900 bg-white"
                            : "border-stone-200 bg-white"
                        } ${option.enabled ? "hover:border-stone-400" : "cursor-not-allowed opacity-60"}`}
                      >
                        <input
                          type="radio"
                          name="payment_method"
                          value={option.value}
                          checked={paymentMethod === option.value}
                          disabled={!option.enabled || pendingId !== null}
                          onChange={() => setPaymentMethod(option.value)}
                          className="mt-0.5 h-4 w-4 accent-stone-900"
                        />
                        <span>
                          <span className="block text-xs font-semibold text-stone-900">
                            {option.label}
                          </span>
                          <span className="block text-xs text-stone-600">{option.description}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>
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
                  disabled={!canCheckout || pendingId !== null || !selectedAddressId}
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
