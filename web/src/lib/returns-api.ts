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

export type ReturnStatus =
  | "REQUESTED"
  | "APPROVED"
  | "RECEIVED"
  | "COMPLETED"
  | "REJECTED"
  | "CANCELLED";

export type ReturnDetail = {
  id: string;
  orderId: string;
  userId: string;
  reason: string;
  status: ReturnStatus;
  note: string;
  requestedAt: string;
  approvedAt: string | null;
  rejectedAt: string | null;
  receivedAt: string | null;
  completedAt: string | null;
  canceledAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateReturnPayload = {
  order_id: string;
  reason: string;
  note?: string;
};

export type ListReturnsQuery = {
  page?: number;
  limit?: number;
  user_id?: string;
  status?: ReturnStatus;
};

export type UpdateReturnStatusPayload = {
  status: Exclude<ReturnStatus, "REQUESTED">;
  note?: string;
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
    throw new Error(getApiErrorMessage(jsonUnknown, "Return request failed"));
  }
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

function mapReturn(raw: Record<string, unknown>): ReturnDetail {
  return {
    id: String(raw.id),
    orderId: String(raw.orderId ?? raw.order_id),
    userId: String(raw.userId ?? raw.user_id),
    reason: String(raw.reason ?? ""),
    status: String(raw.status) as ReturnStatus,
    note: String(raw.note ?? ""),
    requestedAt: String(raw.requestedAt ?? raw.requested_at ?? ""),
    approvedAt: (raw.approvedAt ?? raw.approved_at ?? null) as string | null,
    rejectedAt: (raw.rejectedAt ?? raw.rejected_at ?? null) as string | null,
    receivedAt: (raw.receivedAt ?? raw.received_at ?? null) as string | null,
    completedAt: (raw.completedAt ?? raw.completed_at ?? null) as string | null,
    canceledAt: (raw.canceledAt ?? raw.canceled_at ?? null) as string | null,
    createdAt: String(raw.createdAt ?? raw.created_at ?? ""),
    updatedAt: String(raw.updatedAt ?? raw.updated_at ?? ""),
  };
}

function toQueryString(params: ListReturnsQuery = {}) {
  const query = new URLSearchParams();
  if (params.page !== undefined) query.set("page", String(params.page));
  if (params.limit !== undefined) query.set("limit", String(params.limit));
  if (params.user_id) query.set("user_id", params.user_id);
  if (params.status) query.set("status", params.status);
  const qs = query.toString();
  return qs.length > 0 ? `?${qs}` : "";
}

export async function createReturn(payload: CreateReturnPayload) {
  const envelope = await withRefresh<Record<string, unknown>>("/returns", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!envelope.data) throw new Error("Unexpected API response format");
  return mapReturn(envelope.data);
}

export async function getReturnById(id: string) {
  const envelope = await withRefresh<Record<string, unknown>>(`/returns/${id}`);
  if (!envelope.data) throw new Error("Unexpected API response format");
  return mapReturn(envelope.data);
}

export async function listReturns(params: ListReturnsQuery = {}) {
  const envelope = await withRefresh<Record<string, unknown>[]>(`/returns${toQueryString(params)}`);
  if (!envelope.data || !envelope.pagination) throw new Error("Unexpected API response format");
  return {
    items: envelope.data.map(mapReturn),
    pagination: envelope.pagination,
  };
}

export async function updateReturnStatus(id: string, payload: UpdateReturnStatusPayload) {
  const envelope = await withRefresh<Record<string, unknown>>(`/returns/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  if (!envelope.data) throw new Error("Unexpected API response format");
  return mapReturn(envelope.data);
}
