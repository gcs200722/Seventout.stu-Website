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

export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PROCESSING"
  | "SHIPPED"
  | "COMPLETED"
  | "CANCELED";

export type PaymentStatus = "UNPAID" | "PAID" | "FAILED" | "REFUNDED";

export type OrderListItem = {
  id: string;
  userId: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod?: "COD" | "VNPAY" | "STRIPE" | null;
  totalAmount: number;
  shippingAddress: {
    full_name: string;
    phone: string;
    address_line: string;
    ward: string;
    district?: string;
    city: string;
    country: string;
  };
  note: string;
  createdAt: string;
  updatedAt: string;
};

export type OrderDetail = {
  id: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  payment_method?: "COD" | "VNPAY" | "STRIPE" | null;
  total_amount: number;
  shipping_address: {
    full_name: string;
    phone: string;
    address_line: string;
    ward: string;
    district?: string;
    city: string;
    country: string;
  };
  items: Array<{
    product_id: string;
    product_name: string;
    price: number;
    quantity: number;
    subtotal: number;
  }>;
  created_at: string;
};

export type CreateOrderPayload = {
  cart_id: string;
  address_id: string;
  note?: string;
};

export type ListOrdersQuery = {
  page?: number;
  limit?: number;
  status?: OrderStatus;
  payment_status?: PaymentStatus;
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
    throw new Error(getApiErrorMessage(jsonUnknown, "Order request failed"));
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

function toQueryString(params: ListOrdersQuery = {}) {
  const query = new URLSearchParams();
  if (params.page !== undefined) query.set("page", String(params.page));
  if (params.limit !== undefined) query.set("limit", String(params.limit));
  if (params.status) query.set("status", params.status);
  if (params.payment_status) query.set("payment_status", params.payment_status);
  const qs = query.toString();
  return qs.length > 0 ? `?${qs}` : "";
}

export async function createMyOrder(payload: CreateOrderPayload, idempotencyKey?: string) {
  const envelope = await withRefresh<{
    order_id: string;
    status: OrderStatus;
    payment_status: PaymentStatus;
    total_amount: number;
    idempotency_key: string;
  }>("/orders", {
    method: "POST",
    headers: idempotencyKey ? { "x-idempotency-key": idempotencyKey } : {},
    body: JSON.stringify(payload),
  });
  if (!envelope.data) {
    throw new Error("Unexpected API response format");
  }
  return envelope.data;
}

export async function listMyOrders(params: ListOrdersQuery = {}) {
  const envelope = await withRefresh<OrderListItem[]>(`/orders${toQueryString(params)}`);
  if (!envelope.data || !envelope.pagination) {
    throw new Error("Unexpected API response format");
  }
  return {
    items: envelope.data,
    pagination: envelope.pagination,
  };
}

export async function getMyOrderDetail(orderId: string) {
  const envelope = await withRefresh<OrderDetail>(`/orders/${orderId}`);
  if (!envelope.data) {
    throw new Error("Unexpected API response format");
  }
  return envelope.data;
}

export async function cancelMyOrder(orderId: string) {
  const envelope = await withRefresh<unknown>(`/orders/${orderId}/cancel`, {
    method: "PATCH",
  });
  return envelope.message ?? "Order canceled successfully";
}
