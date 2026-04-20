import { withAuth } from "@/lib/http-client";

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
  const envelope = await withAuth<Record<string, unknown>[]>(
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
  const envelope = await withAuth<unknown>(`/notifications/${notificationId}/read`, {
    method: "PATCH",
  });
  return envelope.message ?? "Notification marked as read";
}

export async function markAllNotificationsAsRead() {
  const envelope = await withAuth<{ updated: number }>("/notifications/read-all", {
    method: "PATCH",
  });
  return envelope.data?.updated ?? 0;
}

export async function getUnreadNotificationCount() {
  const response = await getNotifications({ page: 1, limit: 1, is_read: false });
  return response.pagination.total;
}
