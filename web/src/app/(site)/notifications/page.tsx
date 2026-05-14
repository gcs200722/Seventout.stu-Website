"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { useAuth } from "@/components/auth/AuthProvider";
import NotificationCard from "@/components/notifications/NotificationCard";
import { useNotificationsFeed } from "@/components/notifications/useNotificationsFeed";

const PAGE_LIMIT = 10;

type ReadFilter = "all" | "unread" | "read";

export default function NotificationsPage() {
  const { loading: authLoading, isAuthenticated, permissions, role } = useAuth();
  const [page, setPage] = useState(1);
  const [readFilter, setReadFilter] = useState<ReadFilter>("all");
  const [success, setSuccess] = useState<string | null>(null);

  const canRead =
    role === "ADMIN" || role === "USER" || permissions.includes("NOTIFICATION_READ");
  const { items, total, loading, actionLoading, error, unreadCount, markAsRead, markAllAsRead } =
    useNotificationsFeed({
      enabled: isAuthenticated && canRead,
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
      setSuccess("Đã đánh dấu thông báo là đã đọc.");
    } catch {
      setSuccess(null);
    }
  }

  async function handleMarkAllAsRead() {
    try {
      setSuccess(null);
      const updated = await markAllAsRead();
      setSuccess(`Đã cập nhật ${updated} thông báo.`);
    } catch {
      setSuccess(null);
    }
  }

  if (authLoading) {
    return <div className="mx-auto w-full max-w-5xl px-4 py-8 text-sm text-stone-500">Đang tải...</div>;
  }

  if (!isAuthenticated) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-8">
        <div className="rounded-xl border border-stone-200 bg-white p-6 text-sm text-stone-700">
          Vui lòng đăng nhập để xem thông báo.
          <Link href="/" className="ml-1 font-semibold underline">
            Về trang chủ
          </Link>
          .
        </div>
      </div>
    );
  }

  if (!canRead) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-8">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-700">
          Tài khoản hiện tại chưa có quyền xem thông báo.
        </div>
      </div>
    );
  }

  return (
    <section className="mx-auto w-full max-w-5xl space-y-5 px-4 py-8">
      <header className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6">
        <h1 className="text-2xl font-semibold tracking-tight text-stone-900">Thông báo của tôi</h1>
        <p className="mt-1 text-sm text-stone-600">
          Theo dõi các cập nhật quan trọng về đơn hàng, thanh toán và vận chuyển.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-stone-600">
          <span className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1.5">
            Tổng thông báo: {total}
          </span>
          <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-amber-700">
            Chưa đọc (trang hiện tại): {unreadCount}
          </span>
          <button
            type="button"
            disabled={actionLoading}
            onClick={() => void handleMarkAllAsRead()}
            className="rounded-full border border-stone-300 px-3 py-1.5 font-semibold text-stone-700 transition-colors hover:bg-stone-100 disabled:opacity-50"
          >
            Đánh dấu tất cả đã đọc
          </button>
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            setPage(1);
            setReadFilter("all");
          }}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
            readFilter === "all"
              ? "border-stone-900 bg-stone-900 text-white"
              : "border-stone-300 text-stone-700 hover:bg-stone-100"
          }`}
        >
          Tất cả
        </button>
        <button
          type="button"
          onClick={() => {
            setPage(1);
            setReadFilter("unread");
          }}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
            readFilter === "unread"
              ? "border-stone-900 bg-stone-900 text-white"
              : "border-stone-300 text-stone-700 hover:bg-stone-100"
          }`}
        >
          Chưa đọc
        </button>
        <button
          type="button"
          onClick={() => {
            setPage(1);
            setReadFilter("read");
          }}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
            readFilter === "read"
              ? "border-stone-900 bg-stone-900 text-white"
              : "border-stone-300 text-stone-700 hover:bg-stone-100"
          }`}
        >
          Đã đọc
        </button>
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
