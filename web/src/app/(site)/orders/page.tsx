"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { useAuth } from "@/components/auth/AuthProvider";
import {
  listMyOrders,
  type OrderStatus,
  type PaymentStatus,
} from "@/lib/orders-api";
import { formatVnd } from "@/lib/products-api";

const PAGE_LIMIT = 10;

export default function MyOrdersPage() {
  const { isAuthenticated, loading } = useAuth();
  const [orders, setOrders] = useState<
    Array<{
      id: string;
      status: OrderStatus;
      paymentStatus: PaymentStatus;
      totalAmount: number;
      createdAt: string;
    }>
  >([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<"" | OrderStatus>("");
  const [paymentFilter, setPaymentFilter] = useState<"" | PaymentStatus>("");
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_LIMIT)), [total]);

  const loadOrders = useCallback(async () => {
    if (!isAuthenticated) {
      setOrders([]);
      setPageLoading(false);
      return;
    }
    setPageLoading(true);
    setError(null);
    try {
      const response = await listMyOrders({
        page,
        limit: PAGE_LIMIT,
        status: statusFilter || undefined,
        payment_status: paymentFilter || undefined,
      });
      setOrders(
        response.items.map((item) => ({
          id: item.id,
          status: item.status,
          paymentStatus: item.paymentStatus,
          totalAmount: item.totalAmount,
          createdAt: item.createdAt,
        })),
      );
      setTotal(response.pagination.total);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không tải được đơn hàng.");
    } finally {
      setPageLoading(false);
    }
  }, [isAuthenticated, page, paymentFilter, statusFilter]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-semibold text-stone-900">Đơn hàng của tôi</h1>
        <p className="mt-1 text-sm text-stone-600">Theo dõi trạng thái và chi tiết đơn hàng đã đặt.</p>

        {loading || pageLoading ? <p className="mt-4 text-sm text-stone-500">Đang tải đơn hàng...</p> : null}
        {error ? (
          <p className="mt-4 whitespace-pre-line rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            {error}
          </p>
        ) : null}

        {!loading && isAuthenticated ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <select
              value={statusFilter}
              onChange={(e) => {
                setPage(1);
                setStatusFilter(e.target.value as "" | OrderStatus);
              }}
              className="rounded-lg border border-stone-300 px-3 py-2 text-xs"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="PENDING">PENDING</option>
              <option value="CONFIRMED">CONFIRMED</option>
              <option value="PROCESSING">PROCESSING</option>
              <option value="SHIPPED">SHIPPED</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="CANCELED">CANCELED</option>
            </select>
            <select
              value={paymentFilter}
              onChange={(e) => {
                setPage(1);
                setPaymentFilter(e.target.value as "" | PaymentStatus);
              }}
              className="rounded-lg border border-stone-300 px-3 py-2 text-xs"
            >
              <option value="">Tất cả thanh toán</option>
              <option value="UNPAID">UNPAID</option>
              <option value="PAID">PAID</option>
              <option value="FAILED">FAILED</option>
              <option value="REFUNDED">REFUNDED</option>
            </select>
          </div>
        ) : null}

        {!loading && !pageLoading && isAuthenticated ? (
          <div className="mt-4 space-y-3">
            {orders.length === 0 ? (
              <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-600">
                Bạn chưa có đơn hàng nào.
              </div>
            ) : (
              orders.map((order) => (
                <article
                  key={order.id}
                  className="rounded-xl border border-stone-200 bg-stone-50 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-sm font-semibold text-stone-900">Mã đơn: {order.id}</h2>
                      <p className="mt-1 text-xs text-stone-600">
                        Trạng thái: {order.status} | Thanh toán: {order.paymentStatus}
                      </p>
                      <p className="mt-1 text-xs text-stone-600">
                        Tạo lúc: {new Date(order.createdAt).toLocaleString("vi-VN")}
                      </p>
                      <p className="mt-1 text-sm font-medium text-stone-900">
                        Tổng tiền: {formatVnd(order.totalAmount)}
                      </p>
                    </div>
                    <Link
                      href={`/orders/${order.id}`}
                      className="rounded-full border border-stone-300 px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-100"
                    >
                      Xem chi tiết
                    </Link>
                  </div>
                </article>
              ))
            )}
          </div>
        ) : null}

        {!loading && isAuthenticated && total > 0 ? (
          <div className="mt-4 flex items-center justify-between text-xs text-stone-600">
            <span>
              Trang {page}/{totalPages} - Tổng {total} đơn
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                className="rounded-md border border-stone-300 px-3 py-1.5 disabled:opacity-40"
              >
                Trước
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((prev) => prev + 1)}
                className="rounded-md border border-stone-300 px-3 py-1.5 disabled:opacity-40"
              >
                Sau
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
