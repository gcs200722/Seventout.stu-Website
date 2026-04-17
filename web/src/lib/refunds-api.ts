import { getApiErrorMessage } from "@/lib/api-error";
import { refreshToken } from "@/lib/auth-api";
import { getStoredTokens, setStoredTokens } from "@/lib/auth-storage";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

type ApiEnvelope<T> = {
  success: boolean;
  data?: T;
  pagination?: {
    page: number;
    limit: number;
    total: number;
  };
};

type AuthorizedRequest = {
  method?: "GET" | "POST" | "PATCH";
  body?: string;
};

export type RefundStatus = "PENDING" | "PROCESSING" | "SUCCESS" | "FAILED";
export type RefundMethod = "BANK_TRANSFER_MANUAL" | "VNPAY" | "STRIPE";

export type RefundDetail = {
  id: string;
  returnId: string;
  orderId: string;
  amount: number;
  method: RefundMethod;
  status: RefundStatus;
  processedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateRefundPayload = {
  return_id: string;
  amount: number;
  method?: RefundMethod;
};

export type ListRefundsQuery = {
  page?: number;
  limit?: number;
  order_id?: string;
  return_id?: string;
  status?: RefundStatus;
};

export type UpdateRefundStatusPayload = {
  status: Exclude<RefundStatus, "PENDING">;
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
  if (!response.ok) throw new Error(getApiErrorMessage(jsonUnknown, "Refund request failed"));
  return jsonUnknown as ApiEnvelope<T>;
}

async function withRefresh<T>(path: string, request: AuthorizedRequest = {}) {
  const tokens = getStoredTokens();
  if (!tokens?.access_token) throw new Error("Bạn chưa đăng nhập.");
  try {
    return await requestWithToken<T>(path, tokens.access_token, request);
  } catch (error) {
    if (!(error instanceof Error) || !/unauthorized|forbidden|jwt/i.test(error.message)) throw error;
    if (!tokens.refresh_token) throw error;
    const refreshed = await refreshToken(tokens.refresh_token);
    setStoredTokens(refreshed);
    return requestWithToken<T>(path, refreshed.access_token, request);
  }
}

function mapRefund(raw: Record<string, unknown>): RefundDetail {
  return {
    id: String(raw.id),
    returnId: String(raw.returnId ?? raw.return_id),
    orderId: String(raw.orderId ?? raw.order_id),
    amount: Number(raw.amount ?? 0),
    method: String(raw.method) as RefundMethod,
    status: String(raw.status) as RefundStatus,
    processedAt: (raw.processedAt ?? raw.processed_at ?? null) as string | null,
    createdAt: String(raw.createdAt ?? raw.created_at ?? ""),
    updatedAt: String(raw.updatedAt ?? raw.updated_at ?? ""),
  };
}

function toQueryString(params: ListRefundsQuery = {}) {
  const query = new URLSearchParams();
  if (params.page !== undefined) query.set("page", String(params.page));
  if (params.limit !== undefined) query.set("limit", String(params.limit));
  if (params.order_id) query.set("order_id", params.order_id);
  if (params.return_id) query.set("return_id", params.return_id);
  if (params.status) query.set("status", params.status);
  const qs = query.toString();
  return qs.length > 0 ? `?${qs}` : "";
}

export async function createRefund(payload: CreateRefundPayload) {
  const envelope = await withRefresh<Record<string, unknown>>("/refunds", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!envelope.data) throw new Error("Unexpected API response format");
  return mapRefund(envelope.data);
}

export async function getRefundById(id: string) {
  const envelope = await withRefresh<Record<string, unknown>>(`/refunds/${id}`);
  if (!envelope.data) throw new Error("Unexpected API response format");
  return mapRefund(envelope.data);
}

export async function listRefunds(params: ListRefundsQuery = {}) {
  const envelope = await withRefresh<Record<string, unknown>[]>(`/refunds${toQueryString(params)}`);
  if (!envelope.data || !envelope.pagination) throw new Error("Unexpected API response format");
  return {
    items: envelope.data.map(mapRefund),
    pagination: envelope.pagination,
  };
}

export async function updateRefundStatus(id: string, payload: UpdateRefundStatusPayload) {
  const envelope = await withRefresh<Record<string, unknown>>(`/refunds/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  if (!envelope.data) throw new Error("Unexpected API response format");
  return mapRefund(envelope.data);
}
