"use client";

import type { ReactNode } from "react";
import { AuthProvider } from "@/components/tenant/core/auth/AuthProvider";
import { CartProvider } from "@/components/tenant/extensions/cart/CartProvider";
import { WishlistProvider } from "@/components/tenant/extensions/wishlist/WishlistProvider";

export function SiteProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <CartProvider>
        <WishlistProvider>{children}</WishlistProvider>
      </CartProvider>
    </AuthProvider>
  );
}
