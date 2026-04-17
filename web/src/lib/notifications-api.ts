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
  method?: "GET" | "PATCH";
  body?: string;
};

export type NotificationChannel = "SYSTEM" | "EMAIL";
export type NotificationType =
  | "ORDER_CREATED"
  | "PAYMENT_SUCCESS"
  | "PAYMENT_FAILED"
  | "FULFILLMENT_SHIPPED"
  | "FULFILLMENT_DELIVERED";

export type NotificationItem = {
  id: string;
  userId: string;
  recipientEmail: string | null;
  type: NotificationType;
  title: string;
  content: string;
  channel: NotificationChannel;
  isRead: boolean;
  metadata: Record<string, unknown>;
  eventSource: string;
  eventId: string;
  readAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ListNotificationsQuery = {
  page?: number;
  limit?: number;
  is_read?: boolean;
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
    throw new Error(getApiErrorMessage(jsonUnknown, "Notification request failed"));
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

function toQueryString(params: ListNotificationsQuery = {}) {
  const query = new URLSearchParams();
  if (params.page !== undefined) query.set("page", String(params.page));
  if (params.limit !== undefined) query.set("limit", String(params.limit));
  if (params.is_read !== undefined) query.set("is_read", String(params.is_read));
  const qs = query.toString();
  return qs.length > 0 ? `?${qs}` : "";
}

function mapNotification(raw: Record<string, unknown>): NotificationItem {
  return {
    id: String(raw.id),
    userId: String(raw.userId ?? raw.user_id),
    recipientEmail: (raw.recipientEmail ?? raw.recipient_email ?? null) as string | null,
    type: String(raw.type) as NotificationType,
    title: String(raw.title ?? ""),
    content: String(raw.content ?? ""),
    channel: String(raw.channel) as NotificationChannel,
    isRead: Boolean(raw.isRead ?? raw.is_read),
    metadata:
      raw.metadata && typeof raw.metadata === "object"
        ? (raw.metadata as Record<string, unknown>)
        : {},
    eventSource: String(raw.eventSource ?? raw.event_source ?? ""),
    eventId: String(raw.eventId ?? raw.event_id ?? ""),
    readAt: (raw.readAt ?? raw.read_at ?? null) as string | null,
    createdAt: String(raw.createdAt ?? raw.created_at ?? ""),
    updatedAt: String(raw.updatedAt ?? raw.updated_at ?? ""),
  };
}

export async function getNotifications(params: ListNotificationsQuery = {}) {
  const envelope = await withRefresh<Record<string, unknown>[]>(
    `/notifications${toQueryString(params)}`,
  );
  if (!envelope.data || !envelope.pagination) {
    throw new Error("Unexpected API response format");
  }
  return {
    items: envelope.data.map(mapNotification),
    pagination: envelope.pagination,
  };
}

export async function markNotificationAsRead(notificationId: string) {
  const envelope = await withRefresh<unknown>(`/notifications/${notificationId}/read`, {
    method: "PATCH",
  });
  return envelope.message ?? "Notification marked as read";
}

export async function markAllNotificationsAsRead() {
  const envelope = await withRefresh<{ updated: number }>("/notifications/read-all", {
    method: "PATCH",
  });
  return envelope.data?.updated ?? 0;
}

export async function getUnreadNotificationCount() {
  const response = await getNotifications({ page: 1, limit: 1, is_read: false });
  return response.pagination.total;
}
