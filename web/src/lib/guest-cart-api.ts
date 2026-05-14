import { getApiErrorMessage } from "@/lib/api-error";
import { apiFetch } from "@/lib/api-fetch";
import {
  getGuestSessionIdForApi,
  rememberGuestSessionIdFromResponse,
} from "@/lib/guest-session-client";
import type { CartSnapshot, CartValidationResult } from "@/lib/cart-api";

type ApiEnvelope<T> = {
  success: boolean;
  data?: T;
  message?: string;
};

function guestHeaders(): Record<string, string> {
  const sid = getGuestSessionIdForApi();
  return sid ? { "x-guest-session-id": sid } : {};
}

async function guestRequest<T>(path: string, init?: RequestInit): Promise<ApiEnvelope<T>> {
  const response = await apiFetch(path, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...guestHeaders(),
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  rememberGuestSessionIdFromResponse(response);
  const jsonUnknown = (await response.json()) as unknown;
  if (!response.ok) {
    throw new Error(getApiErrorMessage(jsonUnknown, "Request failed"));
  }
  return jsonUnknown as ApiEnvelope<T>;
}

export async function getGuestCart(): Promise<CartSnapshot> {
  const envelope = await guestRequest<CartSnapshot>("/guest/cart");
  if (!envelope.data) {
    throw new Error("Unexpected API response format");
  }
  return envelope.data;
}

export async function addGuestCartItem(
  productId: string,
  productVariantId: string,
  quantity: number,
): Promise<string> {
  const envelope = await guestRequest<unknown>("/guest/cart/items", {
    method: "POST",
    body: JSON.stringify({
      product_id: productId,
      product_variant_id: productVariantId,
      quantity,
    }),
  });
  return envelope.message ?? "Cart item added successfully";
}

export async function updateGuestCartItem(
  itemId: string,
  quantity: number,
  productVariantId?: string,
): Promise<string> {
  const envelope = await guestRequest<unknown>(`/guest/cart/items/${itemId}`, {
    method: "PATCH",
    body: JSON.stringify({
      quantity,
      product_variant_id: productVariantId,
    }),
  });
  return envelope.message ?? "Cart item updated successfully";
}

export async function removeGuestCartItem(itemId: string): Promise<string> {
  const envelope = await guestRequest<unknown>(`/guest/cart/items/${itemId}`, {
    method: "DELETE",
  });
  return envelope.message ?? "Cart item deleted successfully";
}

export async function clearGuestCart(): Promise<string> {
  const envelope = await guestRequest<unknown>("/guest/cart/clear", {
    method: "DELETE",
  });
  return envelope.message ?? "Cart cleared successfully";
}

export async function validateGuestCart(): Promise<CartValidationResult> {
  const envelope = await guestRequest<CartValidationResult>("/guest/cart/validate", {
    method: "POST",
  });
  if (!envelope.data) {
    throw new Error("Unexpected API response format");
  }
  return envelope.data;
}
