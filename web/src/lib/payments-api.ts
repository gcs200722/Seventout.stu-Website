import { getApiErrorMessage } from "@/lib/api-error";
import { refreshToken } from "@/lib/auth-api";
import { getStoredTokens, setStoredTokens } from "@/lib/auth-storage";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

type ApiEnvelope<T> = {
  success: boolean;
  data?: T;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
  };
};

type AuthorizedRequest = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: string;
  headers?: Record<string, string>;
};

export type PaymentMethod = "COD" | "VNPAY" | "STRIPE";
export type PaymentStatus = "PENDING" | "SUCCESS" | "FAILED" | "CANCELED";

export type PaymentDetail = {
  id: string;
  orderId: string;
  method: PaymentMethod;
  status: PaymentStatus;
  amount: number;
  transactionId: string | null;
  idempotencyKey: string | null;
  createdAt: string;
  updatedAt: string;
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
      ...(request.headers ?? {}),
    },
    body: request.body,
    cache: "no-store",
  });

  const jsonUnknown = (await response.json()) as unknown;
  if (!response.ok) {
    throw new Error(getApiErrorMessage(jsonUnknown, "Payment request failed"));
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
    setStoredTokens(refreshed);
    return requestWithToken<T>(path, refreshed.access_token, request);
  }
}

export async function createMyPayment(
  payload: {
    order_id: string;
    payment_method: PaymentMethod;
  },
  idempotencyKey?: string,
) {
  const envelope = await withRefresh<{
    payment_id: string;
    status: PaymentStatus;
    method: PaymentMethod;
  }>("/payments", {
    method: "POST",
    headers: idempotencyKey ? { "x-idempotency-key": idempotencyKey } : {},
    body: JSON.stringify(payload),
  });
  if (!envelope.data) {
    throw new Error("Unexpected API response format");
  }
  return envelope.data;
}

export async function getMyPaymentDetail(paymentId: string) {
  const envelope = await withRefresh<PaymentDetail>(`/payments/${paymentId}`);
  if (!envelope.data) {
    throw new Error("Unexpected API response format");
  }
  return envelope.data;
}
