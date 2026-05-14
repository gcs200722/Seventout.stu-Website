"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { useAuth } from "@/components/auth/AuthProvider";
import { getMyCart } from "@/lib/cart-api";
import { getGuestCart } from "@/lib/guest-cart-api";

type CartContextValue = {
  cartCount: number;
  refreshCartCount: () => Promise<void>;
};

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  const [cartCount, setCartCount] = useState(0);

  const refreshCartCount = useCallback(async () => {
    if (loading) {
      return;
    }
    if (!isAuthenticated) {
      try {
        const cart = await getGuestCart();
        setCartCount(cart.total_items);
      } catch {
        setCartCount(0);
      }
      return;
    }
    try {
      const cart = await getMyCart();
      setCartCount(cart.total_items);
    } catch {
      setCartCount(0);
    }
  }, [isAuthenticated, loading]);

  useEffect(() => {
    if (loading) {
      return;
    }

    let active = true;
    const load = isAuthenticated ? getMyCart() : getGuestCart();
    void load
      .then((cart) => {
        if (active) {
          setCartCount(cart.total_items);
        }
      })
      .catch(() => {
        if (active) {
          setCartCount(0);
        }
      });
    return () => {
      active = false;
    };
  }, [isAuthenticated, loading]);

  const value = useMemo(
    () => ({
      cartCount,
      refreshCartCount,
    }),
    [cartCount, refreshCartCount],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within CartProvider");
  }
  return context;
}
