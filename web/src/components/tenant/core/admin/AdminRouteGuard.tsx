"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAuth } from "@/components/tenant/core/auth/AuthProvider";

export function AdminRouteGuard({ children }: { children: React.ReactNode }) {
  const { loading, isAuthenticated, canAccessAdmin, role } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!isAuthenticated) {
      router.replace("/");
      return;
    }

    if (!canAccessAdmin) {
      router.replace("/");
    }
  }, [loading, isAuthenticated, canAccessAdmin, router, pathname]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-100">
        <p className="text-sm text-stone-600">Đang tải phiên đăng nhập...</p>
      </div>
    );
  }

  if (!isAuthenticated || !canAccessAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-100 px-4">
        <div className="w-full max-w-lg rounded-2xl border border-stone-200 bg-white p-6 text-center shadow-sm">
          <h1 className="text-lg font-semibold text-stone-900">Bạn không có quyền truy cập</h1>
          <p className="mt-2 text-sm text-stone-600">
            Tài khoản hiện tại ({role ?? "guest"}) không thể truy cập khu vực quản trị.
          </p>
          <Link
            href="/"
            className="mt-4 inline-flex rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700"
          >
            Quay về trang chủ
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
