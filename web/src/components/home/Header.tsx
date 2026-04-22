"use client";

import { useState } from "react";
import Link from "next/link";

import { AuthPanel } from "@/components/auth/AuthPanel";
import { useAuth } from "@/components/auth/AuthProvider";
import { useCart } from "@/components/cart/CartProvider";
import { MegaMenu } from "@/components/home/header/MegaMenu";
import { HeaderSearch } from "@/components/home/header/HeaderSearch";
import { MobileMenuDrawer } from "@/components/home/header/MobileMenuDrawer";
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

type HeaderProps = {
  categoryLinks?: CategoryNavLink[];
};

export function Header({ categoryLinks = [] }: HeaderProps) {
  const { isAuthenticated, loading, logout } = useAuth();
  const { cartCount } = useCart();
  const { wishlistCount } = useWishlist();

  const [showAuthPanel, setShowAuthPanel] = useState(false);
  const [openSearch, setOpenSearch] = useState(false);
  const [openMobileMenu, setOpenMobileMenu] = useState(false);

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

          <div className="flex items-center justify-end gap-2 md:flex-1">
            <div className="relative">
              <Link
                href="/products"
                aria-label="Search products"
                className="rounded-full border border-transparent p-2 text-[#2f2a24] transition-colors hover:bg-[#eadfcd] md:hidden"
              >
                <IconSearch className="h-5 w-5" />
              </Link>
              <button
                type="button"
                aria-label="Search"
                onClick={() => setOpenSearch((prev) => !prev)}
                className="hidden rounded-full border border-transparent p-2 text-[#2f2a24] transition-colors hover:bg-[#eadfcd] md:inline-flex"
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
                className="relative rounded-full border border-transparent p-2 text-[#2f2a24] transition-colors hover:bg-[#eadfcd]"
              >
                <IconCart className="h-5 w-5" />
                {isAuthenticated && cartCount > 0 ? (
                  <span className="absolute -right-1.5 -top-1.5 min-w-5 rounded-full bg-[#3d3228] px-1.5 py-0.5 text-center text-[10px] font-semibold text-white">
                    {cartCount}
                  </span>
                ) : null}
              </Link>
            </div>

            {isAuthenticated ? (
              <Link
                href="/wishlist"
                aria-label={wishlistCount > 0 ? `Wishlist ${wishlistCount} items` : "Wishlist"}
                className="relative rounded-full border border-[#d9ccb6] p-2 text-[#2f2a24] transition-colors hover:bg-[#eadfcd]"
              >
                <IconHeartOutline className="h-5 w-5" />
                {wishlistCount > 0 ? (
                  <span className="absolute -right-1.5 -top-1.5 min-w-5 rounded-full bg-[#3d3228] px-1.5 py-0.5 text-center text-[10px] font-semibold text-white">
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
                  className="inline-flex rounded-full border border-[#d9ccb6] p-2 text-[#2f2a24] transition-colors hover:bg-[#eadfcd] md:hidden"
                >
                  <IconUser className="h-5 w-5" />
                </Link>
                <Link
                  href="/profile"
                  aria-label="Account"
                  className="hidden items-center gap-1 rounded-full border border-[#d9ccb6] px-3 py-1.5 text-sm font-medium text-[#2f2a24] transition-colors hover:bg-[#eadfcd] md:inline-flex"
                >
                  <IconUser className="h-4.5 w-4.5" />
                  <span>Account</span>
                </Link>
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
