"use client";

import { useState } from "react";
import Link from "next/link";

import { AuthPanel } from "@/components/auth/AuthPanel";
import { useAuth } from "@/components/auth/AuthProvider";

import type { CategoryNavLink } from "@/lib/categories-api";

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

type HeaderProps = {
  /** Danh mục gốc từ API (server layout truyền xuống) */
  categoryLinks?: CategoryNavLink[];
};

export function Header({ categoryLinks = [] }: HeaderProps) {
  const { user, isAuthenticated, loading, logout } = useAuth();
  const [showAuthPanel, setShowAuthPanel] = useState(false);

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
            <button
              type="button"
              aria-label="Giỏ hàng"
              className="rounded-full border border-stone-300 p-2 text-stone-700 transition-colors hover:bg-stone-900 hover:text-white"
            >
              <IconCart className="h-5 w-5" />
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
    </>
  );
}
