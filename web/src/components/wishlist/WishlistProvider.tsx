"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { useAuth } from "@/components/auth/AuthProvider";
import { getWishlistItemCount } from "@/lib/wishlist-api";

type WishlistContextValue = {
  wishlistCount: number;
  refreshWishlistCount: () => Promise<void>;
};

const WishlistContext = createContext<WishlistContextValue | undefined>(undefined);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  const [wishlistCount, setWishlistCount] = useState(0);

  const refreshWishlistCount = useCallback(async () => {
    if (!isAuthenticated) {
      setWishlistCount(0);
      return;
    }
    try {
      const count = await getWishlistItemCount();
      setWishlistCount(count);
    } catch {
      setWishlistCount(0);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (loading || !isAuthenticated) {
      return;
    }

    let active = true;
    void getWishlistItemCount()
      .then((count) => {
        if (active) {
          setWishlistCount(count);
        }
      })
      .catch(() => {
        if (active) {
          setWishlistCount(0);
        }
      });
    return () => {
      active = false;
    };
  }, [isAuthenticated, loading]);

  /** Logged-out UI must show 0 without syncing state inside the effect (react-hooks/set-state-in-effect). */
  const wishlistCountForUi = isAuthenticated ? wishlistCount : 0;

  const value = useMemo(
    () => ({
      wishlistCount: wishlistCountForUi,
      refreshWishlistCount,
    }),
    [wishlistCountForUi, refreshWishlistCount],
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error("useWishlist must be used within WishlistProvider");
  }
  return context;
}
