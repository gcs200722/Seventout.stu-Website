import type { PromotionConditionsDisplay } from "@/lib/promotion-conditions";
import { promotionConditionsHintVi } from "@/lib/promotion-conditions";

type PromotionConditionsHintProps = {
  display: PromotionConditionsDisplay | undefined;
  className?: string;
};

/** Explains min-qty / min-order for auto promos (total quantity ≠ distinct SKUs). */
export function PromotionConditionsHint({ display, className }: PromotionConditionsHintProps) {
  const text = promotionConditionsHintVi(display);
  if (!text) {
    return null;
  }
  return (
    <p
      className={
        className ??
        "mt-1 text-[11px] leading-snug text-stone-500 [&:not(:first-child)]:mt-1.5"
      }
    >
      {text}
    </p>
  );
}
