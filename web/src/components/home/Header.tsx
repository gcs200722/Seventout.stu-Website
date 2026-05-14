"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

import { AuthPanel } from "@/components/auth/AuthPanel";
import { useAuth } from "@/components/auth/AuthProvider";
import { useCart } from "@/components/cart/CartProvider";
import { MegaMenu } from "@/components/home/header/MegaMenu";
import { HeaderSearch } from "@/components/home/header/HeaderSearch";
import { MobileMenuDrawer } from "@/components/home/header/MobileMenuDrawer";
import { useNotificationsFeed } from "@/components/notifications/useNotificationsFeed";
import { useWishlist } from "@/components/wishlist/WishlistProvider";
import type { CategoryNavLink } from "@/lib/categories-api";

function IconMenu({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
    </svg>
  );
}

function IconSearch({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" strokeLinecap="round" />
    </svg>
  );
}

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
      <path
        d="M6 9a6 6 0 0 1 12 0v4l1.5 2.5H4.5L6 13V9Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M10 18a2 2 0 0 0 4 0" strokeLinecap="round" />
    </svg>
  );
}

type HeaderProps = {
  categoryLinks?: CategoryNavLink[];
};

export function Header({ categoryLinks = [] }: HeaderProps) {
  const { isAuthenticated, loading, logout } = useAuth();
  const { cartCount } = useCart();
  const { wishlistCount } = useWishlist();
  const { items, unreadCount, markAsRead, markAllAsRead, actionLoading } = useNotificationsFeed({
    enabled: isAuthenticated,
    page: 1,
    limit: 8,
    readFilter: "all",
    pollIntervalMs: 5000,
  });

  const [showAuthPanel, setShowAuthPanel] = useState(false);
  const [openSearch, setOpenSearch] = useState(false);
  const [openMobileMenu, setOpenMobileMenu] = useState(false);
  const [openAccountMenu, setOpenAccountMenu] = useState(false);
  const [openNotificationsMenu, setOpenNotificationsMenu] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);
  const notificationsMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!openAccountMenu) return;
    function onPointerDown(event: MouseEvent) {
      if (!accountMenuRef.current?.contains(event.target as Node)) {
        setOpenAccountMenu(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpenAccountMenu(false);
      }
    }
    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [openAccountMenu]);

  useEffect(() => {
    if (!openNotificationsMenu) return;
    function onPointerDown(event: MouseEvent) {
      if (!notificationsMenuRef.current?.contains(event.target as Node)) {
        setOpenNotificationsMenu(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpenNotificationsMenu(false);
      }
    }
    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [openNotificationsMenu]);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-[#e8dcc8] bg-[#f7f2e8]/95 shadow-[0_1px_8px_rgba(120,110,90,0.08)] backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-2 md:flex-1">
            <button
              type="button"
              aria-label="Open menu"
              onClick={() => setOpenMobileMenu(true)}
              className="inline-flex rounded-full border border-[#d9ccb6] p-2 text-[#2f2a24] md:hidden"
            >
              <IconMenu className="h-5 w-5" />
            </button>

            <Link href="/" className="text-base font-semibold tracking-[0.08em] text-[#2a221b] sm:text-lg">
              SEVENOUT
            </Link>
          </div>

          <nav className="hidden items-center justify-center gap-8 md:flex md:flex-1" aria-label="Main navigation">
            <MegaMenu items={categoryLinks} />
            <Link href="/products" className="text-sm font-medium text-[#2f2a24] transition-colors hover:text-[#7a5d3d]">
              Collection
            </Link>
            <Link href="/about" className="text-sm font-medium text-[#2f2a24] transition-colors hover:text-[#7a5d3d]">
              About
            </Link>
            <Link href="/blog" className="text-sm font-medium text-[#2f2a24] transition-colors hover:text-[#7a5d3d]">
              Blog
            </Link>
          </nav>

          <div className="flex items-center justify-end gap-1 sm:gap-2 md:flex-1">
            <div className="relative">
              <Link
                href="/products"
                aria-label="Search products"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-transparent text-[#2f2a24] transition-colors hover:bg-[#eadfcd] md:hidden"
              >
                <IconSearch className="h-5 w-5" />
              </Link>
              <button
                type="button"
                aria-label="Search"
                onClick={() => setOpenSearch((prev) => !prev)}
                className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full border border-transparent text-[#2f2a24] transition-colors hover:bg-[#eadfcd] md:inline-flex"
              >
                <IconSearch className="h-5 w-5" />
              </button>
              <div className="hidden md:block">
                <HeaderSearch open={openSearch} onClose={() => setOpenSearch(false)} />
              </div>
            </div>

            <div className="relative">
              <Link
                href="/cart"
                aria-label="Cart"
                className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-transparent text-[#2f2a24] transition-colors hover:bg-[#eadfcd]"
              >
                <IconCart className="h-5 w-5" />
                {cartCount > 0 ? (
                  <span className="absolute right-0 top-0 min-w-5 translate-x-1/3 -translate-y-1/3 rounded-full bg-[#3d3228] px-1.5 py-0.5 text-center text-[10px] font-semibold text-white">
                    {cartCount}
                  </span>
                ) : null}
              </Link>
            </div>

            {isAuthenticated ? (
              <div className="relative" ref={notificationsMenuRef}>
                <button
                  type="button"
                  aria-label={unreadCount > 0 ? `Notifications ${unreadCount} unread` : "Notifications"}
                  aria-expanded={openNotificationsMenu}
                  onClick={() => setOpenNotificationsMenu((prev) => !prev)}
                  className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#d9ccb6] text-[#2f2a24] transition-colors hover:bg-[#eadfcd]"
                >
                  <IconBell className="h-5 w-5" />
                  {unreadCount > 0 ? (
                    <span className="absolute right-0 top-0 min-w-5 translate-x-1/3 -translate-y-1/3 rounded-full bg-[#3d3228] px-1.5 py-0.5 text-center text-[10px] font-semibold text-white">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  ) : null}
                </button>
                {openNotificationsMenu ? (
                  <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-80 rounded-xl border border-[#e2d5bf] bg-[#fffdf9] p-2 shadow-xl">
                    <div className="mb-2 flex items-center justify-between px-2">
                      <p className="text-sm font-semibold text-[#2f2a24]">Thông báo của bạn</p>
                      {unreadCount > 0 ? (
                        <button
                          type="button"
                          disabled={actionLoading}
                          onClick={() => void markAllAsRead()}
                          className="text-xs font-semibold text-[#7a5d3d] hover:underline disabled:opacity-50"
                        >
                          Đọc tất cả
                        </button>
                      ) : null}
                    </div>
                    <div className="max-h-80 space-y-1 overflow-y-auto px-1 pb-1">
                      {items.length === 0 ? (
                        <p className="rounded-md px-2 py-3 text-xs text-[#6f665b]">Chưa có thông báo.</p>
                      ) : (
                        items.map((notification) => (
                          <Link
                            key={notification.id}
                            href={
                              typeof notification.metadata?.action_url === "string"
                                ? notification.metadata.action_url
                                : "/notifications"
                            }
                            onClick={() => {
                              setOpenNotificationsMenu(false);
                              if (!notification.isRead) {
                                void markAsRead(notification.id);
                              }
                            }}
                            className={`rounded-md border px-2 py-2 text-xs ${
                              notification.isRead
                                ? "border-[#e8dcc8] bg-white text-[#6f665b]"
                                : "border-[#d9ccb6] bg-[#f7f2e8] text-[#2f2a24]"
                            } block transition hover:bg-[#f3eadc]`}
                          >
                            <p className="font-semibold">{notification.title}</p>
                            <p className="mt-1 line-clamp-2">{notification.content}</p>
                            <div className="mt-2 flex items-center justify-between gap-2">
                              <span className="text-[11px] text-[#7c7468]">
                                {new Date(notification.createdAt).toLocaleString("vi-VN")}
                              </span>
                              {typeof notification.metadata?.action_url === "string" ? (
                                <span className="text-[11px] font-semibold text-[#7a5d3d]">
                                  Đi tới chi tiết
                                </span>
                              ) : !notification.isRead ? (
                                <span className="text-[11px] font-semibold text-[#7a5d3d]">
                                  Chưa đọc
                                </span>
                              ) : null}
                            </div>
                          </Link>
                        ))
                      )}
                    </div>
                    <div className="mt-1 border-t border-[#e8dcc8] px-2 pt-2">
                      <Link
                        href="/notifications"
                        onClick={() => setOpenNotificationsMenu(false)}
                        className="inline-flex rounded-full border border-[#d9ccb6] px-3 py-1.5 text-xs font-semibold text-[#2f2a24] hover:bg-[#f3eadc]"
                      >
                        Xem tất cả thông báo
                      </Link>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            {isAuthenticated ? (
              <Link
                href="/wishlist"
                aria-label={wishlistCount > 0 ? `Wishlist ${wishlistCount} items` : "Wishlist"}
                className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#d9ccb6] text-[#2f2a24] transition-colors hover:bg-[#eadfcd]"
              >
                <IconHeartOutline className="h-5 w-5" />
                {wishlistCount > 0 ? (
                  <span className="absolute right-0 top-0 min-w-5 translate-x-1/3 -translate-y-1/3 rounded-full bg-[#3d3228] px-1.5 py-0.5 text-center text-[10px] font-semibold text-white">
                    {wishlistCount > 99 ? "99+" : wishlistCount}
                  </span>
                ) : null}
              </Link>
            ) : null}

            {loading ? (
              <span className="hidden text-xs text-[#6f665b] lg:inline">Loading...</span>
            ) : isAuthenticated ? (
              <>
                <Link
                  href="/profile"
                  aria-label="Account"
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#d9ccb6] text-[#2f2a24] transition-colors hover:bg-[#eadfcd] md:hidden"
                >
                  <IconUser className="h-5 w-5" />
                </Link>
                <div className="relative hidden md:block" ref={accountMenuRef}>
                  <button
                    type="button"
                    aria-label="Account menu"
                    aria-expanded={openAccountMenu}
                    onClick={() => setOpenAccountMenu((prev) => !prev)}
                    className="inline-flex items-center gap-1 rounded-full border border-[#d9ccb6] px-3 py-1.5 text-sm font-medium text-[#2f2a24] transition-colors hover:bg-[#eadfcd]"
                  >
                    <IconUser className="h-4.5 w-4.5" />
                    <span>Account</span>
                  </button>
                  {openAccountMenu ? (
                    <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-52 rounded-xl border border-[#e2d5bf] bg-[#fffdf9] p-2 shadow-xl">
                      <Link
                        href="/profile"
                        onClick={() => setOpenAccountMenu(false)}
                        className="block rounded-md px-3 py-2 text-sm text-[#2f2a24] transition hover:bg-[#f3eadc]"
                      >
                        Tài khoản
                      </Link>
                      <Link
                        href="/orders"
                        onClick={() => setOpenAccountMenu(false)}
                        className="block rounded-md px-3 py-2 text-sm text-[#2f2a24] transition hover:bg-[#f3eadc]"
                      >
                        Đơn hàng
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          void logout().finally(() => setOpenAccountMenu(false));
                        }}
                        className="mt-1 block w-full rounded-md border border-[#d9ccb6] px-3 py-2 text-left text-sm font-semibold text-[#2f2a24] transition hover:bg-[#f3eadc]"
                      >
                        Đăng xuất
                      </button>
                    </div>
                  ) : null}
                </div>
              </>
            ) : null}
            {!loading && !isAuthenticated ? (
              <button
                type="button"
                aria-label="Account"
                onClick={() => setShowAuthPanel(true)}
                className="inline-flex items-center gap-1 rounded-full border border-[#d9ccb6] px-3 py-1.5 text-sm font-medium text-[#2f2a24] transition-colors hover:bg-[#eadfcd]"
              >
                <IconUser className="h-4.5 w-4.5" />
                <span className="hidden sm:inline">Account</span>
              </button>
            ) : null}
          </div>
        </div>
      </header>

      <MobileMenuDrawer
        open={openMobileMenu}
        isAuthenticated={isAuthenticated}
        onClose={() => setOpenMobileMenu(false)}
        onOpenAuth={() => setShowAuthPanel(true)}
        onLogout={logout}
      />

      {!isAuthenticated && showAuthPanel ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="Close authentication popup"
            className="absolute inset-0 cursor-default"
            onClick={() => setShowAuthPanel(false)}
          />
          <div className="relative z-10 w-full max-w-sm">
            <button
              type="button"
              onClick={() => setShowAuthPanel(false)}
              className="mb-2 ml-auto block rounded-full border border-stone-300 bg-white px-3 py-1 text-xs font-semibold text-stone-700 hover:bg-stone-100"
            >
              Close
            </button>
            <AuthPanel />
          </div>
        </div>
      ) : null}

      {openSearch ? (
        <button
          type="button"
          aria-label="Close overlays"
          className="fixed inset-0 z-30 bg-transparent"
          onClick={() => {
            setOpenSearch(false);
          }}
        />
      ) : null}
    </>
  );
}
