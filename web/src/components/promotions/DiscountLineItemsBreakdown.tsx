import { formatVnd } from "@/lib/products-api";

export type DiscountLineItem = {
  product_id: string;
  product_name?: string;
  subtotal?: number;
  discount_amount: number;
  attribution?: "auto" | "coupon";
};

type DiscountLineItemsBreakdownProps = {
  items: DiscountLineItem[];
  className?: string;
};

/** Per-product discount rows from pricing_snapshot (cart / order). */
export function DiscountLineItemsBreakdown({ items, className }: DiscountLineItemsBreakdownProps) {
  if (items.length === 0) {
    return null;
  }
  const couponOnly = items.every((i) => i.attribution === "coupon");
  return (
    <div className={className ?? "space-y-1.5"}>
      <p className="text-xs font-semibold text-stone-800">Chi tiết giảm giá theo sản phẩm</p>
      <ul className="space-y-1">
        {items.map((row, idx) => (
          <li key={`${row.product_id}-${idx}`} className="flex justify-between gap-3 text-xs text-stone-700">
            <span className="min-w-0 truncate">{row.product_name ?? row.product_id}</span>
            <span className="shrink-0 font-medium text-emerald-700">−{formatVnd(row.discount_amount)}</span>
          </li>
        ))}
      </ul>
      {couponOnly ? (
        <p className="text-[10px] leading-snug text-stone-500">
          Mã giảm giá áp trên cả đơn; số tiền trên từng dòng được phân bổ theo tỷ lệ tạm tính để hiển thị minh họa.
        </p>
      ) : null}
    </div>
  );
}
