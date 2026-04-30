"use client";

import { useMemo, useState } from "react";

import { useAuth } from "@/components/tenant/core/auth/AuthProvider";
import NotificationCard from "@/components/tenant/core/notifications/NotificationCard";
import { useNotificationsFeed } from "@/components/tenant/core/notifications/useNotificationsFeed";

const PAGE_LIMIT = 10;
type ReadFilter = "all" | "unread" | "read";

export default function AdminNotificationsPage() {
  const { role, permissions } = useAuth();
  const [page, setPage] = useState(1);
  const [readFilter, setReadFilter] = useState<ReadFilter>("all");
  const [success, setSuccess] = useState<string | null>(null);

  const canRead =
    role === "ADMIN" || role === "STAFF" || permissions.includes("NOTIFICATION_READ");
  const canManage = role === "ADMIN" || permissions.includes("NOTIFICATION_MANAGE");
  const { items, total, loading, actionLoading, error, markAsRead, markAllAsRead } =
    useNotificationsFeed({
      enabled: canRead,
      page,
      limit: PAGE_LIMIT,
      readFilter,
      pollIntervalMs: 15000,
    });
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_LIMIT)), [total]);

  async function handleMarkAsRead(id: string) {
    try {
      setSuccess(null);
      await markAsRead(id);
      setSuccess("Đã cập nhật trạng thái thông báo.");
    } catch {
      setSuccess(null);
    }
  }

  async function handleMarkAllAsRead() {
    if (!canManage) {
      return;
    }
    try {
      setSuccess(null);
      const updated = await markAllAsRead();
      setSuccess(`Đã cập nhật ${updated} thông báo.`);
    } catch {
      setSuccess(null);
    }
  }

  if (!canRead) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
        Tài khoản hiện tại chưa có quyền truy cập thông báo.
      </div>
    );
  }

  return (
    <section className="space-y-5">
      <header className="rounded-xl border border-stone-200 bg-white p-4 sm:p-5">
        <h1 className="text-2xl font-semibold text-stone-900">Quản lý thông báo</h1>
        <p className="mt-1 text-sm text-stone-600">
          Theo dõi trạng thái thông báo và hỗ trợ xử lý nhanh các thông báo chưa đọc.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-stone-600">
          <span className="rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1">
            Tổng: {total}
          </span>
          <button
            type="button"
            disabled={actionLoading || !canManage}
            onClick={() => void handleMarkAllAsRead()}
            className="rounded-full border border-stone-300 px-3 py-1.5 font-semibold text-stone-700 hover:bg-stone-100 disabled:opacity-50"
          >
            Đánh dấu tất cả đã đọc
          </button>
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        {(["all", "unread", "read"] as const).map((filter) => (
          <button
            key={filter}
            type="button"
            onClick={() => {
              setPage(1);
              setReadFilter(filter);
            }}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
              readFilter === filter
                ? "border-stone-900 bg-stone-900 text-white"
                : "border-stone-300 text-stone-700 hover:bg-stone-100"
            }`}
          >
            {filter === "all" ? "Tất cả" : filter === "unread" ? "Chưa đọc" : "Đã đọc"}
          </button>
        ))}
      </div>

      {loading ? <p className="text-sm text-stone-500">Đang tải dữ liệu...</p> : null}
      {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div> : null}
      {success ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          {success}
        </div>
      ) : null}

      {!loading && !error ? (
        <div className="space-y-3">
          {items.length === 0 ? (
            <div className="rounded-xl border border-stone-200 bg-white p-6 text-sm text-stone-500">
              Chưa có thông báo phù hợp với bộ lọc hiện tại.
            </div>
          ) : (
            items.map((item) => (
              <NotificationCard
                key={item.id}
                notification={item}
                onMarkAsRead={handleMarkAsRead}
                disabled={actionLoading}
              />
            ))
          )}
        </div>
      ) : null}

      <div className="flex items-center justify-between border-t border-stone-200 pt-4 text-xs text-stone-600">
        <span>
          Trang {page}/{totalPages} - Tổng {total} thông báo
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
    </section>
  );
}
