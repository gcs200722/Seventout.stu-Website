"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { AuthPanel } from "@/components/auth/AuthPanel";
import { useAuth } from "@/components/auth/AuthProvider";
import { useCart } from "@/components/cart/CartProvider";
import { useWishlist } from "@/components/wishlist/WishlistProvider";
import {
  type NotificationItem,
} from "@/lib/notifications-api";
import { useNotificationsFeed } from "@/components/notifications/useNotificationsFeed";

import type { CategoryNavLink } from "@/lib/categories-api";

const NOTIFICATION_POLL_INTERVAL_MS = 15000;
const NOTIFICATION_PANEL_POLL_INTERVAL_MS = 5000;

function IconHeartOutline({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path
        d="M12 21s-7-4.6-9.6-9.4C-.4 8.5 2.1 4 6.5 4c2.2 0 3.9 1.1 5.5 3C13.6 5.1 15.3 4 17.5 4 21.9 4 24.4 8.5 21.6 11.6 19 16.4 12 21 12 21Z"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconCart({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M6 6h15l-1.5 9h-12z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 6 5 3H2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="9" cy="20" r="1" fill="currentColor" stroke="none" />
      <circle cx="18" cy="20" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconUser({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" strokeLinecap="round" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function IconBell({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M12 3a5 5 0 0 0-5 5v3.5l-1.4 2.8a1 1 0 0 0 .9 1.4h11a1 1 0 0 0 .9-1.4L17 11.5V8a5 5 0 0 0-5-5Z" />
      <path d="M10 19a2 2 0 0 0 4 0" strokeLinecap="round" />
    </svg>
  );
}

function IconOrder({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M4 7h16l-1.5 10h-13z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7" strokeLinecap="round" />
    </svg>
  );
}

function IconPayment({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M3 10h18" strokeLinecap="round" />
      <path d="M8 14h3" strokeLinecap="round" />
    </svg>
  );
}

function IconTruck({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M3 7h11v8H3z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 10h3l3 3v2h-6z" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="7" cy="17" r="1.6" />
      <circle cx="17" cy="17" r="1.6" />
    </svg>
  );
}

function getRelativeTimeLabel(value: string): string {
  const createdAt = new Date(value);
  const timestamp = createdAt.getTime();
  if (Number.isNaN(timestamp)) {
    return "-";
  }

  const diffMs = Date.now() - timestamp;
  const diffSeconds = Math.max(0, Math.floor(diffMs / 1000));
  if (diffSeconds < 60) return "Vừa xong";
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes} phút trước`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} giờ trước`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays} ngày trước`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths} tháng trước`;
  const diffYears = Math.floor(diffMonths / 12);
  return `${diffYears} năm trước`;
}

function NotificationLineIcon({ type }: { type: NotificationItem["type"] }) {
  const baseClass = "h-4.5 w-4.5";
  if (type === "PAYMENT_SUCCESS" || type === "PAYMENT_FAILED") {
    return (
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
        <IconPayment className={baseClass} />
      </span>
    );
  }
  if (type === "FULFILLMENT_SHIPPED" || type === "FULFILLMENT_DELIVERED") {
    return (
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
        <IconTruck className={baseClass} />
      </span>
    );
  }
  return (
    <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
      <IconOrder className={baseClass} />
    </span>
  );
}

type HeaderProps = {
  /** Danh mục gốc từ API (server layout truyền xuống) */
  categoryLinks?: CategoryNavLink[];
};

export function Header({ categoryLinks = [] }: HeaderProps) {
  const { user, isAuthenticated, loading, logout } = useAuth();
  const { cartCount } = useCart();
  const { wishlistCount } = useWishlist();
  const [showAuthPanel, setShowAuthPanel] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [openNotifications, setOpenNotifications] = useState(false);
  const [notificationsError, setNotificationsError] = useState<string | null>(null);
  const {
    items: notificationItems,
    loading: notificationsLoading,
    error,
    unreadCount: unreadInPanel,
    total: totalNotifications,
    markAsRead,
    markAllAsRead,
    reload,
  } = useNotificationsFeed({
    enabled: isAuthenticated,
    page: 1,
    limit: 10,
    pollIntervalMs: openNotifications
      ? NOTIFICATION_PANEL_POLL_INTERVAL_MS
      : NOTIFICATION_POLL_INTERVAL_MS,
  });

  useEffect(() => {
    if (!isAuthenticated) {
      setOpenNotifications(false);
      setNotificationsError(null);
      setUnreadCount(0);
      return;
    }
    setUnreadCount(totalNotifications);
  }, [isAuthenticated, totalNotifications]);

  useEffect(() => {
    setNotificationsError(error);
  }, [error]);

  async function handleMarkAllAsRead() {
    try {
      await markAllAsRead();
    } catch (error) {
      setNotificationsError(
        error instanceof Error ? error.message : "Không thể cập nhật thông báo.",
      );
    }
  }

  async function handleOpenNotification(id: string) {
    const selected = notificationItems.find((item) => item.id === id);
    if (!selected) {
      return;
    }
    if (!selected.isRead) {
      try {
        await markAsRead(id);
      } catch {
        // Keep panel interaction resilient even if mark-read fails.
      }
    }
    await reload(false).catch(() => undefined);
    setOpenNotifications(false);
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-stone-200/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
          <Link href="/" className="text-lg font-bold tracking-tight text-stone-900">
          Sevenout
          </Link>

          <nav className="hidden items-center gap-6 md:flex" aria-label="Điều hướng chính">
            <Link
              href="/products"
              className="text-sm font-medium text-stone-700 transition-colors hover:text-stone-950"
            >
              Cửa hàng
            </Link>
            {categoryLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm font-medium text-stone-700 transition-colors hover:text-stone-950"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <label className="hidden items-center rounded-full border border-stone-300 bg-white px-3 py-1.5 sm:flex">
              <span className="mr-2 text-sm text-stone-500">Tìm kiếm</span>
              <input
                type="search"
                placeholder="hoodie, áo thun..."
                className="w-28 bg-transparent text-sm text-stone-900 outline-none placeholder:text-stone-400 lg:w-44"
                aria-label="Tìm kiếm sản phẩm"
              />
            </label>
            <Link
              href="/cart"
              aria-label="Giỏ hàng"
              className="relative rounded-full border border-stone-300 p-2 text-stone-700 transition-colors hover:bg-stone-900 hover:text-white"
            >
              <IconCart className="h-5 w-5" />
              {isAuthenticated && cartCount > 0 ? (
                <span className="absolute -right-1.5 -top-1.5 min-w-5 rounded-full bg-stone-900 px-1.5 py-0.5 text-center text-[10px] font-semibold text-white">
                  {cartCount}
                </span>
              ) : null}
            </Link>
            {isAuthenticated ? (
              <Link
                href="/wishlist"
                aria-label={wishlistCount > 0 ? `Yêu thích, ${wishlistCount} sản phẩm` : "Yêu thích"}
                className="relative rounded-full border border-stone-300 p-2 text-rose-600 transition-colors hover:bg-rose-50 hover:text-rose-700"
              >
                <IconHeartOutline className="h-5 w-5" />
                {wishlistCount > 0 ? (
                  <span className="absolute -right-1.5 -top-1.5 min-w-5 rounded-full bg-stone-900 px-1.5 py-0.5 text-center text-[10px] font-semibold text-white">
                    {wishlistCount > 99 ? "99+" : wishlistCount}
                  </span>
                ) : null}
              </Link>
            ) : null}
            {isAuthenticated ? (
              <div className="relative">
                <button
                  type="button"
                  aria-label="Mở thông báo"
                  aria-expanded={openNotifications}
                  className="relative rounded-full border border-stone-300 p-2 text-stone-700 transition-colors hover:bg-stone-900 hover:text-white"
                  onClick={() => setOpenNotifications((prev) => !prev)}
                >
                  <IconBell className="h-5 w-5" />
                  {unreadCount > 0 ? (
                    <span className="absolute -right-1.5 -top-1.5 min-w-5 rounded-full bg-stone-900 px-1.5 py-0.5 text-center text-[10px] font-semibold text-white">
                      {unreadCount}
                    </span>
                  ) : null}
                </button>

                {openNotifications ? (
                  <aside className="absolute right-0 top-[calc(100%+12px)] z-50 w-[min(92vw,420px)] overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xl">
                    <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3">
                      <div>
                        <p className="text-lg font-semibold text-stone-900">Thông báo</p>
                        <p className="text-xs text-stone-500">Chưa đọc: {unreadInPanel}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleMarkAllAsRead()}
                        disabled={notificationsLoading || unreadInPanel === 0}
                        className="text-sm font-medium text-sky-600 transition-colors hover:text-sky-700 disabled:opacity-50"
                      >
                        Mark All as Read
                      </button>
                    </div>

                    {notificationsLoading ? (
                      <div className="px-4 py-8 text-center text-sm text-stone-500">Đang tải...</div>
                    ) : notificationsError ? (
                      <div className="m-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                        {notificationsError}
                      </div>
                    ) : notificationItems.length === 0 ? (
                      <div className="px-4 py-8 text-center text-sm text-stone-500">
                        Chưa có thông báo mới.
                      </div>
                    ) : (
                      <div className="max-h-[62vh] overflow-y-auto">
                        {notificationItems.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => void handleOpenNotification(item.id)}
                            className={`relative block w-full border-b border-stone-100 px-4 py-3 text-left transition-colors ${
                              item.isRead
                                ? "bg-white hover:bg-stone-50"
                                : "bg-sky-50/40 hover:bg-sky-50"
                            }`}
                          >
                            {!item.isRead ? (
                              <span className="absolute left-2 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-rose-500" />
                            ) : null}
                            <div className="flex items-start gap-3 pl-2">
                              <NotificationLineIcon type={item.type} />
                              <div className="min-w-0">
                                <p className="line-clamp-1 text-sm font-semibold text-stone-900">
                                  {item.title}
                                </p>
                                <p className="mt-1 line-clamp-2 text-sm text-stone-600">{item.content}</p>
                                <p className="mt-2 text-xs text-stone-500">
                                  {getRelativeTimeLabel(item.createdAt)}
                                </p>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="border-t border-stone-200 bg-white px-4 py-2">
                      <Link
                        href="/notifications"
                        className="text-sm font-medium text-stone-700 transition-colors hover:text-stone-900"
                        onClick={() => setOpenNotifications(false)}
                      >
                        Xem tất cả thông báo
                      </Link>
                    </div>
                  </aside>
                ) : null}
              </div>
            ) : null}
            {loading ? (
              <div className="text-xs text-stone-500">Đang tải...</div>
            ) : isAuthenticated ? (
              <div className="flex items-center gap-2">
                <div className="hidden text-xs text-stone-700 sm:block">
                  Xin chào, <span className="font-semibold">{user?.first_name}</span>
                </div>
                <Link
                  href="/profile"
                  className="rounded-full border border-stone-300 px-3 py-1.5 text-xs font-semibold text-stone-700 transition-colors hover:bg-stone-900 hover:text-white"
                >
                  Hồ sơ
                </Link>
                <Link
                  href="/orders"
                  className="rounded-full border border-stone-300 px-3 py-1.5 text-xs font-semibold text-stone-700 transition-colors hover:bg-stone-900 hover:text-white"
                >
                  Đơn hàng
                </Link>
                <button
                  type="button"
                  onClick={() => void logout()}
                  className="rounded-full border border-stone-300 px-3 py-1.5 text-xs font-semibold text-stone-700 transition-colors hover:bg-stone-900 hover:text-white"
                >
                  Đăng xuất
                </button>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  aria-label="Tài khoản"
                  onClick={() => setShowAuthPanel(true)}
                  className="rounded-full border border-stone-300 p-2 text-stone-700 transition-colors hover:bg-stone-900 hover:text-white"
                >
                  <IconUser className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => setShowAuthPanel(true)}
                  className="hidden rounded-full border border-stone-300 px-3 py-1.5 text-xs font-semibold text-stone-700 transition-colors hover:bg-stone-900 hover:text-white sm:block"
                >
                  Đăng nhập
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {!isAuthenticated && showAuthPanel ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4"
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            aria-label="Đóng popup đăng nhập"
            className="absolute inset-0 cursor-default"
            onClick={() => setShowAuthPanel(false)}
          />
          <div className="relative z-10 w-full max-w-sm">
            <button
              type="button"
              onClick={() => setShowAuthPanel(false)}
              className="mb-2 ml-auto block rounded-full border border-stone-300 bg-white px-3 py-1 text-xs font-semibold text-stone-700 hover:bg-stone-100"
            >
              Đóng
            </button>
            <AuthPanel />
          </div>
        </div>
      ) : null}

      {isAuthenticated && openNotifications ? (
        <button
          type="button"
          aria-label="Đóng thông báo"
          className="fixed inset-0 z-30 bg-transparent"
          onClick={() => setOpenNotifications(false)}
        />
      ) : null}
    </>
  );
}
