"use client";

import { DiscountLineItemsBreakdown } from "@/components/tenant/extensions/promotions/DiscountLineItemsBreakdown";
import { PromotionConditionsHint } from "@/components/tenant/extensions/promotions/PromotionConditionsHint";
import type { CartDiscountLineItem, CartPricingSnapshot } from "@/lib/promotions-api";
import { formatVnd } from "@/lib/products-api";

export type CartPromotionSectionProps = {
  code: string;
  onCodeChange: (value: string) => void;
  onApply: () => void;
  onRemove: () => void;
  busy: boolean;
  /** True while initial quote load. */
  loadingQuote: boolean;
  error: string | null;
  /** Subtotal line (VND). */
  subtotalAmount: number;
  discountAmount: number;
  finalTotal: number;
  appliedCouponCode: string | null;
  /** Server quote snapshot (auto promo conditions for shopper-facing copy). */
  pricingSnapshot?: CartPricingSnapshot | null;
};

export default function CartPromotionSection({
  code,
  onCodeChange,
  onApply,
  onRemove,
  busy,
  loadingQuote,
  error,
  subtotalAmount,
  discountAmount,
  finalTotal,
  appliedCouponCode,
  pricingSnapshot,
}: CartPromotionSectionProps) {
  const autoConditions = pricingSnapshot?.auto_promotion?.conditions_display;
  const discountLineItems = (pricingSnapshot?.discount_line_items ?? []) as CartDiscountLineItem[];
  const hasLineBreakdown = discountLineItems.length > 0;

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-stone-900">Mã giảm giá</h2>
      <p className="mt-1 text-xs text-stone-600">Áp dụng coupon (nếu có). Giá cuối do server xác nhận khi tạo đơn.</p>

      <div className="mt-3 flex flex-wrap gap-2">
        <input
          value={code}
          onChange={(event) => onCodeChange(event.target.value)}
          placeholder="Nhập mã"
          disabled={busy}
          className="min-w-[160px] flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 outline-none focus:border-stone-800 disabled:opacity-60"
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => onApply()}
          className="rounded-full bg-stone-900 px-4 py-2 text-xs font-semibold text-white hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Áp dụng
        </button>
        <button
          type="button"
          disabled={busy || !appliedCouponCode}
          onClick={() => onRemove()}
          className="rounded-full border border-stone-300 px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Gỡ mã
        </button>
      </div>

      {appliedCouponCode ? (
        <p className="mt-2 text-xs text-emerald-700">
          Đang áp dụng: <span className="font-semibold">{appliedCouponCode}</span>
        </p>
      ) : null}

      {error ? <p className="mt-2 whitespace-pre-line text-xs text-rose-600">{error}</p> : null}

      <div className="mt-4 space-y-1 border-t border-stone-100 pt-3 text-sm text-stone-700">
        <div className="flex justify-between gap-2">
          <span>Tạm tính</span>
          <span className="font-medium text-stone-900">
            {loadingQuote ? "…" : formatVnd(subtotalAmount)}
          </span>
        </div>
        {hasLineBreakdown && !loadingQuote && discountAmount > 0 ? (
          <>
            <DiscountLineItemsBreakdown items={discountLineItems} className="rounded-md border border-stone-100 bg-stone-50/80 p-2.5" />
            <div className="flex justify-between gap-2 text-sm font-semibold text-stone-900">
              <span>Tổng giảm giá</span>
              <span className="text-emerald-800">−{formatVnd(discountAmount)}</span>
            </div>
          </>
        ) : (
          <div className="flex justify-between gap-2">
            <span>Giảm giá</span>
            <span className="font-medium text-stone-900">
              {loadingQuote ? "…" : discountAmount > 0 ? `-${formatVnd(discountAmount)}` : formatVnd(0)}
            </span>
          </div>
        )}
        {!loadingQuote && discountAmount > 0 && autoConditions ? (
          <PromotionConditionsHint
            display={autoConditions}
            className="rounded-md bg-stone-50 px-2 py-1.5 text-[11px] leading-snug text-stone-600"
          />
        ) : null}
        <div className="flex justify-between gap-2 border-t border-stone-100 pt-2 text-base font-semibold text-stone-900">
          <span>Thành tiền</span>
          <span>{loadingQuote ? "…" : formatVnd(finalTotal)}</span>
        </div>
      </div>
    </div>
  );
}
