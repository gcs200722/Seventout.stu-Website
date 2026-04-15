"use client";

import { useEffect, useState } from "react";

import { getAdminOrders } from "@/lib/admin-api";

export default function AdminOrdersPage() {
  const [message, setMessage] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadOrders() {
      try {
        const response = await getAdminOrders();
        setMessage(response.message);
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Không tải được dữ liệu đơn hàng.");
      } finally {
        setLoading(false);
      }
    }

    void loadOrders();
  }, []);

  return (
    <section className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold">Quản lý đơn hàng</h1>
        <p className="mt-1 text-sm text-stone-600">
          Endpoint hiện tại là placeholder có kiểm tra quyền `ORDER_MANAGE`.
        </p>
      </header>

      {loading ? <p className="text-sm text-stone-500">Đang tải dữ liệu...</p> : null}

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {!loading && !error ? (
        <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-600">Phản hồi API</h2>
          <p className="mt-2 text-sm text-stone-800">{message || "Order endpoint authorized"}</p>
        </div>
      ) : null}
    </section>
  );
}
