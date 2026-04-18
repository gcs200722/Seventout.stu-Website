import { getApiErrorMessage } from "@/lib/api-error";
import { withAuth } from "@/lib/http-client";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export type ActivePromotionCampaign = {
  id: string;
  name: string;
  type: string;
  discount_type: string;
  value: number;
  max_discount: number | null;
  priority: number;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
};

export type ActivePromotionsPayload = {
  campaigns: ActivePromotionCampaign[];
  fetched_at: string;
};

export type CartAutoPromotionSnapshot = {
  campaign_id?: string;
  campaign_name?: string;
  discount_amount?: number;
  conditions_display?: {
    min_quantity: number | null;
    min_order_value: number | null;
    scoped_to_products?: boolean;
    scoped_to_categories?: boolean;
  };
};

/** Per-line discount from server (snake_case in JSON). */
export type CartDiscountLineItem = {
  product_id: string;
  product_name?: string;
  subtotal?: number;
  discount_amount: number;
  attribution?: "auto" | "coupon";
};

export type CartPricingSnapshot = {
  subtotal_amount?: number;
  discount_total?: number;
  total_amount?: number;
  stack_mode?: string;
  coupon?: {
    id: string;
    code: string;
    discount_amount?: number;
  };
  auto_promotion?: CartAutoPromotionSnapshot;
  /** When present, prefer this over a single aggregate "Giảm giá" label. */
  discount_line_items?: CartDiscountLineItem[];
  free_shipping?: boolean;
} & Record<string, unknown>;

export type CartPromotionQuote = {
  subtotal_amount: number;
  discount: number;
  final_total: number;
  pricing_snapshot: CartPricingSnapshot;
};

export type ApplyCartCouponResult = {
  valid: boolean;
  discount: number;
  final_total: number;
  subtotal_amount: number;
  pricing_snapshot: CartPricingSnapshot;
};

async function parsePublicEnvelope<T>(response: Response): Promise<T> {
  const jsonUnknown = await response.json();
  if (!response.ok) {
    throw new Error(getApiErrorMessage(jsonUnknown, "Request failed"));
  }
  const envelope = jsonUnknown as { success?: boolean; data?: T };
  if (!envelope.success || envelope.data === undefined) {
    throw new Error("Unexpected API response format");
  }
  return envelope.data;
}

/** Public: active auto campaigns (no auth). */
export async function getActivePromotions(): Promise<ActivePromotionsPayload> {
  const response = await fetch(`${API_URL}/promotions/active`, { cache: "no-store" });
  return parsePublicEnvelope<ActivePromotionsPayload>(response);
}

export async function getCartPromotionQuote(): Promise<CartPromotionQuote> {
  const envelope = await withAuth<CartPromotionQuote>("/promotions/cart-quote");
  if (!envelope.data) {
    throw new Error("Unexpected API response format");
  }
  return envelope.data;
}

export async function applyCartCoupon(code: string): Promise<ApplyCartCouponResult> {
  const envelope = await withAuth<ApplyCartCouponResult>("/cart/coupon", {
    method: "POST",
    body: JSON.stringify({ code }),
  });
  if (!envelope.data) {
    throw new Error("Unexpected API response format");
  }
  return envelope.data;
}

export async function removeCartCoupon(): Promise<void> {
  await withAuth<unknown>("/cart/coupon", {
    method: "DELETE",
  });
}
