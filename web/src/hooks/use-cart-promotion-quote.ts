"use client";

import { useCallback, useEffect, useState } from "react";

import {
  applyCartCoupon as applyCartCouponRequest,
  getCartPromotionQuote,
  removeCartCoupon as removeCartCouponRequest,
  type CartPromotionQuote,
} from "@/lib/promotions-api";

/**
 * @param cartRefreshKey — change when cart lines/totals change so quote reloads (e.g. hash of items).
 */
export function useCartPromotionQuote(enabled: boolean, cartRefreshKey = "") {
  const [quote, setQuote] = useState<CartPromotionQuote | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionPending, setActionPending] = useState(false);

  const loadQuote = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getCartPromotionQuote();
      setQuote(data);
    } catch (requestError) {
      setQuote(null);
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Không tải được giá khuyến mãi cho giỏ hàng.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      setQuote(null);
      setError(null);
      setLoading(false);
      return;
    }
    void loadQuote();
  }, [enabled, cartRefreshKey, loadQuote]);

  const apply = useCallback(
    async (code: string) => {
      if (!enabled) {
        return;
      }
      setActionPending(true);
      setError(null);
      try {
        await applyCartCouponRequest(code);
        await loadQuote();
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Không áp dụng được mã.");
      } finally {
        setActionPending(false);
      }
    },
    [enabled, loadQuote],
  );

  const remove = useCallback(async () => {
    if (!enabled) {
      return;
    }
    setActionPending(true);
    setError(null);
    try {
      await removeCartCouponRequest();
      await loadQuote();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không gỡ được mã.");
    } finally {
      setActionPending(false);
    }
  }, [enabled, loadQuote]);

  return { quote, loading, error, apply, remove, refresh: loadQuote, actionPending };
}
