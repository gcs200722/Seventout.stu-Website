import { getApiErrorMessage } from "@/lib/api-error";
import { apiFetch } from "@/lib/api-fetch";
import {
  getGuestSessionIdForApi,
  rememberGuestSessionIdFromResponse,
} from "@/lib/guest-session-client";

type ApiEnvelope<T> = {
  success: boolean;
  data?: T;
  message?: string;
};

export type GuestShippingPayload = {
  full_name: string;
  phone: string;
  email: string;
  /** Số nhà và tên đường */
  address_line: string;
  ward: string;
  city: string;
  country: string;
  /** Không dùng; gửi chuỗi rỗng nếu cần. */
  district?: string;
};

export type GuestCheckoutPayload = {
  cart_id: string;
  shipping: GuestShippingPayload;
  note?: string;
};

export type GuestCheckoutResult = {
  order_id: string;
  order_number: string;
  lookup_secret: string;
  status: string;
  payment_status: string;
  total_amount: number;
  payment_id: string;
  guest_payment_status: string;
};

function guestHeaders(): Record<string, string> {
  const sid = getGuestSessionIdForApi();
  return sid ? { "x-guest-session-id": sid } : {};
}

export async function guestCheckout(
  payload: GuestCheckoutPayload,
  idempotencyKey?: string,
): Promise<GuestCheckoutResult> {
  const response = await apiFetch("/guest/checkout", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...guestHeaders(),
      ...(idempotencyKey ? { "x-idempotency-key": idempotencyKey } : {}),
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });
  rememberGuestSessionIdFromResponse(response);
  const jsonUnknown = (await response.json()) as unknown;
  if (!response.ok) {
    throw new Error(getApiErrorMessage(jsonUnknown, "Checkout failed"));
  }
  const envelope = jsonUnknown as ApiEnvelope<GuestCheckoutResult>;
  if (!envelope.data) {
    throw new Error("Unexpected API response format");
  }
  return envelope.data;
}

export type PublicOrderLookupPayload = {
  order_number: string;
  email: string;
  lookup_secret: string;
};

export type PublicOrderLookupResult = {
  order_number: string;
  status: string;
  payment_status: string;
  total_amount: number;
  created_at: string;
  items: Array<{ product_name: string; quantity: number; subtotal: number }>;
};

export async function lookupPublicOrder(
  payload: PublicOrderLookupPayload,
): Promise<PublicOrderLookupResult> {
  const response = await apiFetch("/public/orders/lookup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  });
  const jsonUnknown = (await response.json()) as unknown;
  if (!response.ok) {
    throw new Error(getApiErrorMessage(jsonUnknown, "Lookup failed"));
  }
  const envelope = jsonUnknown as ApiEnvelope<PublicOrderLookupResult>;
  if (!envelope.data) {
    throw new Error("Unexpected API response format");
  }
  return envelope.data;
}
