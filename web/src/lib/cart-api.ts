import { refreshToken } from "@/lib/auth-api";
import { getApiErrorMessage } from "@/lib/api-error";
import { getStoredTokens, setStoredAccessToken } from "@/lib/auth-storage";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

type ApiEnvelope<T> = {
  success: boolean;
  data?: T;
  message?: string;
};

type AuthorizedRequest = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: string;
};

export type CartItem = {
  item_id: string;
  product_id: string;
  product_name: string;
  price: number;
  quantity: number;
  available_stock: number;
  subtotal: number;
};

export type CartSnapshot = {
  cart_id: string;
  items: CartItem[];
  total_amount: number;
  total_items: number;
};

export type CartValidationResult = {
  valid: boolean;
  issues: Array<{
    code: "OUT_OF_STOCK" | "PRICE_CHANGED" | "PRODUCT_UNAVAILABLE";
    product_id: string;
    message: string;
  }>;
};

async function requestWithToken<T>(
  path: string,
  accessToken: string,
  request: AuthorizedRequest = {},
): Promise<ApiEnvelope<T>> {
  const response = await fetch(`${API_URL}${path}`, {
    method: request.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: request.body,
    cache: "no-store",
  });

  const jsonUnknown = (await response.json()) as unknown;
  if (!response.ok) {
    throw new Error(getApiErrorMessage(jsonUnknown, "Cart request failed"));
  }
  return jsonUnknown as ApiEnvelope<T>;
}

async function withRefresh<T>(path: string, request: AuthorizedRequest = {}) {
  const tokens = getStoredTokens();
  if (!tokens?.access_token) {
    throw new Error("Bạn chưa đăng nhập.");
  }

  try {
    return await requestWithToken<T>(path, tokens.access_token, request);
  } catch (error) {
    if (!(error instanceof Error) || !/unauthorized|forbidden|jwt/i.test(error.message)) {
      throw error;
    }
    if (!tokens.refresh_token) {
      throw error;
    }
    const refreshed = await refreshToken(tokens.refresh_token);
    setStoredAccessToken(refreshed.access_token);
    return requestWithToken<T>(path, refreshed.access_token, request);
  }
}

export async function getMyCart(): Promise<CartSnapshot> {
  const envelope = await withRefresh<CartSnapshot>("/cart");
  if (!envelope.data) {
    throw new Error("Unexpected API response format");
  }
  return envelope.data;
}

export async function addToCart(productId: string, quantity: number) {
  const envelope = await withRefresh<unknown>("/cart/items", {
    method: "POST",
    body: JSON.stringify({
      product_id: productId,
      quantity,
    }),
  });
  return envelope.message ?? "Cart item added successfully";
}

export async function updateCartItem(itemId: string, quantity: number) {
  const envelope = await withRefresh<unknown>(`/cart/items/${itemId}`, {
    method: "PATCH",
    body: JSON.stringify({ quantity }),
  });
  return envelope.message ?? "Cart item updated successfully";
}

export async function removeCartItem(itemId: string) {
  const envelope = await withRefresh<unknown>(`/cart/items/${itemId}`, {
    method: "DELETE",
  });
  return envelope.message ?? "Cart item removed successfully";
}

export async function clearMyCart() {
  const envelope = await withRefresh<unknown>("/cart/clear", { method: "DELETE" });
  return envelope.message ?? "Cart cleared successfully";
}

export async function validateMyCart(): Promise<CartValidationResult> {
  const envelope = await withRefresh<CartValidationResult>("/cart/validate", {
    method: "POST",
  });
  if (!envelope.data) {
    throw new Error("Unexpected API response format");
  }
  return envelope.data;
}
