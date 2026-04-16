"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import { cancelMyOrder, getMyOrderDetail } from "@/lib/orders-api";
import { formatVnd } from "@/lib/products-api";

function canCancelOrder(status: string) {
  return status === "PENDING" || status === "CONFIRMED";
}

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const orderId = Array.isArray(params.id) ? params.id[0] : params.id;
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [order, setOrder] = useState<Awaited<ReturnType<typeof getMyOrderDetail>> | null>(null);

  useEffect(() => {
    async function loadOrder() {
      setLoading(true);
      setError(null);
      try {
        const detail = await getMyOrderDetail(orderId);
        setOrder(detail);
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Không tải được chi tiết đơn hàng.");
      } finally {
        setLoading(false);
      }
    }
    if (orderId) {
      void loadOrder();
    }
  }, [orderId]);

  async function handleCancelOrder() {
    if (!order || !canCancelOrder(order.status)) {
      return;
    }
    const confirmed = window.confirm("Bạn chắc chắn muốn hủy đơn hàng này?");
    if (!confirmed) {
      return;
    }
    setActionLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const message = await cancelMyOrder(order.id);
      setSuccess(message);
      const refreshed = await getMyOrderDetail(order.id);
      setOrder(refreshed);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể hủy đơn hàng.");
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-semibold text-stone-900">Chi tiết đơn hàng</h1>
          <button
            type="button"
            onClick={() => router.push("/orders")}
            className="rounded-full border border-stone-300 px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-100"
          >
            Về danh sách đơn
          </button>
        </div>

        {loading ? <p className="mt-4 text-sm text-stone-500">Đang tải dữ liệu đơn hàng...</p> : null}
        {error ? (
          <p className="mt-4 whitespace-pre-line rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            {error}
          </p>
        ) : null}
        {success ? (
          <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
            {success}
          </p>
        ) : null}

        {!loading && order ? (
          <div className="mt-5 space-y-4">
            <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700">
              <p>
                <span className="font-semibold text-stone-900">Mã đơn:</span> {order.id}
              </p>
              <p className="mt-1">
                <span className="font-semibold text-stone-900">Trạng thái:</span> {order.status}
              </p>
              <p className="mt-1">
                <span className="font-semibold text-stone-900">Thanh toán:</span> {order.payment_status}
              </p>
              <p className="mt-1">
                <span className="font-semibold text-stone-900">Tổng tiền:</span> {formatVnd(order.total_amount)}
              </p>
              <p className="mt-1">
                <span className="font-semibold text-stone-900">Người nhận:</span> {order.shipping_address.full_name} (
                {order.shipping_address.phone})
              </p>
              <p className="mt-1">
                <span className="font-semibold text-stone-900">Địa chỉ:</span>{" "}
                {order.shipping_address.address_line}, {order.shipping_address.ward}, {order.shipping_address.city},{" "}
                {order.shipping_address.country}
              </p>
              <p className="mt-1">
                <span className="font-semibold text-stone-900">Thời gian tạo:</span>{" "}
                {new Date(order.created_at).toLocaleString("vi-VN")}
              </p>
              {canCancelOrder(order.status) ? (
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => void handleCancelOrder()}
                  className="mt-3 rounded-full border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                >
                  {actionLoading ? "Đang xử lý..." : "Hủy đơn hàng"}
                </button>
              ) : null}
            </div>

            <div className="space-y-3">
              <h2 className="text-base font-semibold text-stone-900">Sản phẩm trong đơn</h2>
              {order.items.map((item) => (
                <article
                  key={`${item.product_id}-${item.product_name}`}
                  className="rounded-xl border border-stone-200 bg-white p-4"
                >
                  <p className="text-sm font-semibold text-stone-900">{item.product_name}</p>
                  <p className="mt-1 text-xs text-stone-600">Mã SP: {item.product_id}</p>
                  <p className="mt-1 text-xs text-stone-600">
                    {formatVnd(item.price)} x {item.quantity}
                  </p>
                  <p className="mt-1 text-sm font-medium text-stone-900">
                    Tạm tính: {formatVnd(item.subtotal)}
                  </p>
                </article>
              ))}
            </div>
            <Link
              href="/products"
              className="inline-flex rounded-full border border-stone-300 px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-100"
            >
              Tiếp tục mua sắm
            </Link>
          </div>
        ) : null}
      </section>
    </div>
  );
}
