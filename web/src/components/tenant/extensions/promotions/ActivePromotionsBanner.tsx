"use client";

import { useEffect, useState } from "react";

import { getActivePromotions, type ActivePromotionsPayload } from "@/lib/promotions-api";

/**
 * Data-driven strip from GET /promotions/active (public).
 * Empty state when there are no active auto campaigns.
 */
export function ActivePromotionsBanner() {
  const [payload, setPayload] = useState<ActivePromotionsPayload | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await getActivePromotions();
        if (!cancelled) {
          setPayload(data);
          setStatus("ready");
        }
      } catch {
        if (!cancelled) {
          setPayload(null);
          setStatus("error");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (status === "loading") {
    return null;
  }

  if (status === "error" || !payload) {
    return null;
  }

  const campaigns = payload.campaigns ?? [];
  if (campaigns.length === 0) {
    return (
      <div className="border-b border-stone-200/80 bg-stone-100/80 px-4 py-2 text-center text-xs text-stone-500">
        Hiện chưa có chương trình khuyến mãi tự động nào đang chạy.
      </div>
    );
  }

  const summary = campaigns
    .map((c) => c.name)
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="border-b border-amber-200/70 bg-amber-50/90 px-4 py-2 text-center text-xs text-amber-950">
      <span className="font-semibold">Khuyến mãi:</span> {summary}
    </div>
  );
}
