"use client";

import Link from "next/link";

type MobileMenuDrawerProps = {
  open: boolean;
  isAuthenticated: boolean;
  onClose: () => void;
  onOpenAuth: () => void;
  onLogout: () => Promise<void>;
};

const MAIN_LINKS = [
  { label: "Shop", href: "/products" },
  { label: "Collection", href: "/products" },
  { label: "About", href: "/about" },
  { label: "Blog", href: "/blog" },
];

export function MobileMenuDrawer({
  open,
  isAuthenticated,
  onClose,
  onOpenAuth,
  onLogout,
}: MobileMenuDrawerProps) {
  if (!open) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Close menu"
        className="fixed inset-0 z-40 bg-black/35"
        onClick={onClose}
      />

      <aside className="fixed left-0 top-0 z-50 h-full w-[min(86vw,340px)] overflow-y-auto border-r border-stone-200 bg-white p-5 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-stone-500">Menu</p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-stone-300 px-3 py-1 text-xs font-semibold text-stone-700"
          >
            Close
          </button>
        </div>

        <nav className="space-y-1" aria-label="Mobile navigation">
          {MAIN_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={onClose}
              className="block rounded-lg px-3 py-2 text-sm font-medium text-stone-800 transition hover:bg-stone-100"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="mt-5 border-t border-stone-200 pt-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">Shop by</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Link href="/products?keyword=shirt" onClick={onClose} className="rounded-lg border border-stone-200 px-3 py-2 text-xs text-stone-700">
              Shirts
            </Link>
            <Link href="/products?keyword=pants" onClick={onClose} className="rounded-lg border border-stone-200 px-3 py-2 text-xs text-stone-700">
              Pants
            </Link>
            <Link href="/products?keyword=dress" onClick={onClose} className="rounded-lg border border-stone-200 px-3 py-2 text-xs text-stone-700">
              Dresses
            </Link>
            <Link href="/products?keyword=bag" onClick={onClose} className="rounded-lg border border-stone-200 px-3 py-2 text-xs text-stone-700">
              Bags
            </Link>
          </div>
        </div>

        <div className="mt-5 border-t border-stone-200 pt-4">
          {isAuthenticated ? (
            <div className="space-y-2">
              <Link href="/profile" onClick={onClose} className="block rounded-lg px-3 py-2 text-sm text-stone-800 hover:bg-stone-100">
                Account
              </Link>
              <Link href="/orders" onClick={onClose} className="block rounded-lg px-3 py-2 text-sm text-stone-800 hover:bg-stone-100">
                Orders
              </Link>
              <Link href="/wishlist" onClick={onClose} className="block rounded-lg px-3 py-2 text-sm text-stone-800 hover:bg-stone-100">
                Wishlist
              </Link>
              <button
                type="button"
                onClick={() => void onLogout().finally(onClose)}
                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-left text-sm font-semibold text-stone-700"
              >
                Logout
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenAuth();
              }}
              className="w-full rounded-lg bg-stone-900 px-3 py-2 text-sm font-semibold text-white"
            >
              Sign in
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
