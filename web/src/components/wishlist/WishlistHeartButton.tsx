"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/components/auth/AuthProvider";
import { useWishlist } from "@/components/wishlist/WishlistProvider";
import {
  addToWishlist,
  checkWishlistFavorite,
  removeFromWishlist,
} from "@/lib/wishlist-api";

type WishlistHeartButtonProps = {
  productId: string;
  /** When set, skips per-card check request (e.g. after prefetching wishlist on a grid page). */
  initialFavorite?: boolean;
  /** Compact: icon on cards. Detail: text button on PDP. */
  variant?: "compact" | "detail";
  className?: string;
};

function IconHeart({ filled, className }: { filled: boolean; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.75"
      aria-hidden
    >
      <path
        d="M12 21s-7-4.6-9.6-9.4C-.4 8.5 2.1 4 6.5 4c2.2 0 3.9 1.1 5.5 3C13.6 5.1 15.3 4 17.5 4 21.9 4 24.4 8.5 21.6 11.6 19 16.4 12 21 12 21Z"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function WishlistHeartButton({
  productId,
  initialFavorite,
  variant = "compact",
  className = "",
}: WishlistHeartButtonProps) {
  const { isAuthenticated, loading } = useAuth();
  const { refreshWishlistCount } = useWishlist();
  const [favorite, setFavorite] = useState<boolean | null>(
    initialFavorite !== undefined ? initialFavorite : null,
  );
  const [statusLoading, setStatusLoading] = useState(initialFavorite === undefined);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    if (!isAuthenticated || initialFavorite !== undefined) {
      setStatusLoading(false);
      return;
    }
    setStatusLoading(true);
    setError(null);
    try {
      const fav = await checkWishlistFavorite(productId);
      setFavorite(fav);
    } catch {
      setFavorite(false);
      setError("Không tải được trạng thái yêu thích.");
    } finally {
      setStatusLoading(false);
    }
  }, [isAuthenticated, initialFavorite, productId]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  async function onToggle() {
    if (favorite === null || submitting) {
      return;
    }
    const next = !favorite;
    const prev = favorite;
    setFavorite(next);
    setSubmitting(true);
    setError(null);
    try {
      if (next) {
        await addToWishlist(productId);
      } else {
        await removeFromWishlist(productId);
      }
      await refreshWishlistCount();
    } catch (e) {
      setFavorite(prev);
      setError(e instanceof Error ? e.message : "Không thể cập nhật yêu thích.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || statusLoading) {
    if (variant === "detail") {
      return <p className="text-xs text-stone-500">Đang tải yêu thích...</p>;
    }
    return (
      <span
        className={`inline-flex h-9 w-9 items-center justify-center rounded-full border border-stone-200 bg-white/90 text-stone-400 ${className}`}
        aria-hidden
      >
        <IconHeart filled={false} className="h-5 w-5" />
      </span>
    );
  }

  if (!isAuthenticated) {
    if (variant === "detail") {
      return (
        <Link
          href="/"
          className="rounded-full border border-stone-300 bg-white px-6 py-3 text-sm font-semibold text-stone-800 transition hover:bg-stone-100"
        >
          Đăng nhập để lưu yêu thích
        </Link>
      );
    }
    return (
      <Link
        href="/"
        className={`inline-flex h-9 w-9 items-center justify-center rounded-full border border-stone-300 bg-white/95 text-rose-500 shadow-sm transition hover:bg-stone-50 ${className}`}
        aria-label="Đăng nhập để lưu yêu thích"
        title="Đăng nhập"
      >
        <IconHeart filled={false} className="h-5 w-5" />
      </Link>
    );
  }

  const isFav = Boolean(favorite);
  const label = isFav ? "Bỏ khỏi yêu thích" : "Thêm vào yêu thích";

  if (variant === "detail") {
    return (
      <div className="flex flex-col gap-1">
        <button
          type="button"
          onClick={() => void onToggle()}
          disabled={submitting || favorite === null}
          className="rounded-full border border-stone-300 bg-white px-6 py-3 text-sm font-semibold text-stone-800 transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Đang lưu..." : isFav ? "Bỏ yêu thích" : "Thêm vào yêu thích"}
        </button>
        {error ? <p className="text-xs text-rose-600">{error}</p> : null}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void onToggle();
      }}
      disabled={submitting || favorite === null}
      aria-label={label}
      title={label}
      aria-pressed={isFav}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-full border border-stone-200 bg-white/95 shadow-sm transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60 ${
        isFav ? "text-rose-600" : "text-stone-500 hover:text-rose-500"
      } ${className}`}
    >
      <IconHeart filled={isFav} className="h-5 w-5" />
    </button>
  );
}
