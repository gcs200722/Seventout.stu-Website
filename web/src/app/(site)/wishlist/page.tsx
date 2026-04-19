"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/components/auth/AuthProvider";
import { ProductCard } from "@/components/home/ProductCard";
import { useWishlist } from "@/components/wishlist/WishlistProvider";
import { getWishlist, type WishlistListItem } from "@/lib/wishlist-api";

const WISHLIST_FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80";

function wishlistImageSrc(raw: string | undefined): string {
  const t = raw?.trim() ?? "";
  if (!t) {
    return WISHLIST_FALLBACK_IMAGE;
  }
  if (t.startsWith("http://") || t.startsWith("https://")) {
    return t;
  }
  return WISHLIST_FALLBACK_IMAGE;
}

export default function WishlistPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { refreshWishlistCount } = useWishlist();
  const [items, setItems] = useState<WishlistListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isAuthenticated) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await getWishlist(1, 100);
      setItems(res.items);
      await refreshWishlistCount();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không tải được danh sách yêu thích.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, refreshWishlistCount]);

  useEffect(() => {
    if (authLoading) {
      return;
    }
    void load();
  }, [authLoading, load]);

  if (authLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center text-stone-600 sm:px-6 lg:px-8">
        Đang kiểm tra tài khoản...
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-stone-900">Yêu thích</h1>
        <p className="mt-4 text-stone-600">Đăng nhập để xem sản phẩm bạn đã lưu.</p>
        <Link
          href="/"
          className="mt-6 inline-flex rounded-full bg-stone-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-stone-700"
        >
          Về trang chủ
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-stone-900">Yêu thích</h1>
          <p className="mt-1 text-sm text-stone-600">Sản phẩm bạn đã lưu để xem lại sau.</p>
        </div>
        <Link
          href="/products"
          className="text-sm font-semibold text-stone-700 underline-offset-4 hover:underline"
        >
          Tiếp tục mua sắm
        </Link>
      </div>

      {loading ? (
        <p className="text-stone-600">Đang tải...</p>
      ) : error ? (
        <p className="text-rose-600">{error}</p>
      ) : items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-stone-200 bg-white px-6 py-12 text-center text-stone-600">
          Bạn chưa lưu sản phẩm nào.{" "}
          <Link href="/products" className="font-semibold text-stone-900 underline">
            Khám phá cửa hàng
          </Link>
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {items.map((item) => (
            <li key={item.product_id}>
              <ProductCard
                product={{
                  id: item.product_id,
                  name: item.product_name,
                  price: item.price,
                  image: wishlistImageSrc(item.image),
                  promotion: item.promotion,
                }}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
