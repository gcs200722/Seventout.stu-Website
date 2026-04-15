"use client";

import { useState } from "react";
import Link from "next/link";

import { AuthPanel } from "@/components/auth/AuthPanel";
import { useAuth } from "@/components/auth/AuthProvider";

const navItems = [
  { label: "Cửa hàng", href: "#" },
  { label: "Nam", href: "#" },
  { label: "Nữ", href: "#" },
  { label: "Phụ kiện", href: "#" },
];

export function Header() {
  const { user, isAuthenticated, loading, logout } = useAuth();
  const [showAuthPanel, setShowAuthPanel] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-stone-200/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
          <Link href="/" className="text-lg font-bold tracking-tight text-stone-900">
            S7 LOCAL
          </Link>

          <nav className="hidden items-center gap-6 md:flex">
            {navItems.map((item) => (
              <Link
                key={item.label}
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
            <button
              type="button"
              aria-label="Giỏ hàng"
              className="rounded-full border border-stone-300 p-2 text-stone-700 transition-colors hover:bg-stone-900 hover:text-white"
            >
              🛒
            </button>
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
                  👤
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
    </>
  );
}
