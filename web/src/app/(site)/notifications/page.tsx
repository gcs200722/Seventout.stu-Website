"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { useAuth } from "@/components/auth/AuthProvider";
import NotificationCard from "@/components/notifications/NotificationCard";
import {
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  type NotificationItem,
} from "@/lib/notifications-api";

const PAGE_LIMIT = 10;
const POLL_INTERVAL_MS = 15000;

type ReadFilter = "all" | "unread" | "read";

export default function NotificationsPage() {
  const { loading: authLoading, isAuthenticated, permissions } = useAuth();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [readFilter, setReadFilter] = useState<ReadFilter>("all");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const canRead = permissions.includes("NOTIFICATION_READ");
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_LIMIT)), [total]);
  const unreadCount = useMemo(
    () => items.filter((item) => !item.isRead).length,
    [items],
  );

  const loadNotifications = useCallback(async (showLoading = true) => {
    if (!isAuthenticated || !canRead) {
      return;
    }
    try {
      if (showLoading) {
        setLoading(true);
      }
      setError(null);
      const response = await getNotifications({
        page,
        limit: PAGE_LIMIT,
        is_read:
          readFilter === "all" ? undefined : readFilter === "read" ? true : false,
      });
      setItems(response.items);
      setTotal(response.pagination.total);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Không tải được thông báo.",
      );
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, [canRead, isAuthenticated, page, readFilter]);

  useEffect(() => {
    if (!isAuthenticated || !canRead) {
      setLoading(false);
      return;
    }
    void loadNotifications(true);
  }, [canRead, isAuthenticated, loadNotifications]);

  useEffect(() => {
    if (!isAuthenticated || !canRead) {
      return;
    }
    const interval = window.setInterval(() => {
      void loadNotifications(false);
    }, POLL_INTERVAL_MS);
    const onFocus = () => {
      void loadNotifications(false);
    };
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [canRead, isAuthenticated, loadNotifications]);

  async function handleMarkAsRead(id: string) {
    try {
      setActionLoading(true);
      setError(null);
      setSuccess(null);
      await markNotificationAsRead(id);
      await loadNotifications(false);
      setSuccess("Đã đánh dấu thông báo là đã đọc.");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Không thể đánh dấu đã đọc.",
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function handleMarkAllAsRead() {
    try {
      setActionLoading(true);
      setError(null);
      setSuccess(null);
      const updated = await markAllNotificationsAsRead();
      await loadNotifications(false);
      setSuccess(`Đã cập nhật ${updated} thông báo.`);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Không thể đánh dấu tất cả đã đọc.",
      );
    } finally {
      setActionLoading(false);
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
