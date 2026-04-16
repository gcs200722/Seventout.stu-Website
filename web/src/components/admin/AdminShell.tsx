"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useAuth } from "@/components/auth/AuthProvider";

const navItems = [
  { href: "/admin", label: "Tổng quan" },
  { href: "/admin/users", label: "Người dùng" },
  { href: "/admin/categories", label: "Danh mục" },
  { href: "/admin/orders", label: "Đơn hàng" },
  { href: "/admin/products", label: "Sản phẩm" },
  { href: "/admin/inventory", label: "Tồn kho" },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, role, logout } = useAuth();

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900">
      <div className="mx-auto flex w-full max-w-7xl gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <aside className="hidden w-64 shrink-0 rounded-2xl border border-stone-200 bg-white p-4 md:block">
          <h1 className="text-lg font-semibold">Sevenout Admin</h1>
          <p className="mt-1 text-xs text-stone-500">Dashboard quản trị nội bộ</p>

          <nav className="mt-4 space-y-1.5">
            {navItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block rounded-lg px-3 py-2 text-sm ${
                    active ? "bg-stone-900 text-white" : "text-stone-700 hover:bg-stone-100"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <div className="flex min-h-[80vh] flex-1 flex-col rounded-2xl border border-stone-200 bg-white">
          <header className="flex items-center justify-between border-b border-stone-200 px-4 py-3 sm:px-6">
            <div>
              <p className="text-sm font-medium">{user?.first_name ?? "Admin"}</p>
              <p className="text-xs text-stone-500">{role ?? "Unknown role"}</p>
            </div>
            <button
              type="button"
              onClick={() => void logout()}
              className="rounded-full border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-100"
            >
              Đăng xuất
            </button>
          </header>

          <nav className="flex gap-2 overflow-x-auto border-b border-stone-200 px-4 py-2 md:hidden">
            {navItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs ${
                    active ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-700"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <main className="flex-1 p-4 sm:p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
