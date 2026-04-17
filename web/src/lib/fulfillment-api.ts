import { getApiErrorMessage } from "@/lib/api-error";
import { refreshToken } from "@/lib/auth-api";
import { getStoredTokens, setStoredAccessToken } from "@/lib/auth-storage";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

type ApiEnvelope<T> = {
  success: boolean;
  data?: T;
  message?: string;
};

type AuthorizedRequest = {
  method?: "GET" | "POST" | "PATCH";
  body?: string;
  headers?: Record<string, string>;
};

export type FulfillmentStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PACKING"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED"
  | "FAILED_DELIVERY";

export type FulfillmentDetail = {
  id: string;
  orderId: string;
  status: FulfillmentStatus;
  trackingCode: string | null;
  shippingProvider: string | null;
  note: string;
  shippedAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateFulfillmentPayload = {
  order_id: string;
  shipping_provider?: string;
  note?: string;
};

export type UpdateFulfillmentStatusPayload = {
  status: FulfillmentStatus;
  tracking_code?: string;
  shipping_provider?: string;
  note?: string;
};

export type FailedDeliveryAction =
  | "RETRY_DELIVERY"
  | "CANCEL_ORDER"
  | "RETURN_TO_WAREHOUSE";

export type HandleFailedDeliveryPayload = {
  action: FailedDeliveryAction;
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
      ...(request.headers ?? {}),
    },
    body: request.body,
    cache: "no-store",
  });
  const jsonUnknown = (await response.json()) as unknown;
  if (!response.ok) {
    throw new Error(getApiErrorMessage(jsonUnknown, "Fulfillment request failed"));
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

function mapFulfillmentDetail(raw: Record<string, unknown>): FulfillmentDetail {
  return {
    id: String(raw.id),
    orderId: String(raw.orderId ?? raw.order_id),
    status: String(raw.status) as FulfillmentStatus,
    trackingCode: (raw.trackingCode ?? raw.tracking_code ?? null) as string | null,
    shippingProvider: (raw.shippingProvider ?? raw.shipping_provider ?? null) as string | null,
    note: String(raw.note ?? ""),
    shippedAt: (raw.shippedAt ?? raw.shipped_at ?? null) as string | null,
    deliveredAt: (raw.deliveredAt ?? raw.delivered_at ?? null) as string | null,
    createdAt: String(raw.createdAt ?? raw.created_at),
    updatedAt: String(raw.updatedAt ?? raw.updated_at),
  };
}

export async function createFulfillment(payload: CreateFulfillmentPayload) {
  const envelope = await withRefresh<Record<string, unknown>>("/fulfillments", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!envelope.data) {
    throw new Error("Unexpected API response format");
  }
  return mapFulfillmentDetail(envelope.data);
}

export async function getFulfillmentByOrderId(orderId: string) {
  const envelope = await withRefresh<Record<string, unknown>>(`/fulfillments/${orderId}`);
  if (!envelope.data) {
    throw new Error("Unexpected API response format");
  }
  return mapFulfillmentDetail(envelope.data);
}

export async function updateFulfillmentStatus(
  id: string,
  payload: UpdateFulfillmentStatusPayload,
) {
  const envelope = await withRefresh<Record<string, unknown>>(`/fulfillments/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  if (!envelope.data) {
    throw new Error("Unexpected API response format");
  }
  return mapFulfillmentDetail(envelope.data);
}

export async function handleFailedDeliveryAction(
  id: string,
  payload: HandleFailedDeliveryPayload,
) {
  const envelope = await withRefresh<Record<string, unknown>>(
    `/fulfillments/${id}/failed-delivery-action`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
  if (!envelope.data) {
    throw new Error("Unexpected API response format");
  }
  return mapFulfillmentDetail(envelope.data);
}
