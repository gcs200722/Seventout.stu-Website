import Link from "next/link";
import type { NotificationItem } from "@/lib/notifications-api";
import NotificationReadBadge from "./NotificationReadBadge";
import NotificationTypeBadge from "./NotificationTypeBadge";

type NotificationCardProps = {
  notification: NotificationItem;
  onMarkAsRead?: (id: string) => Promise<void> | void;
  disabled?: boolean;
};

export default function NotificationCard({
  notification,
  onMarkAsRead,
  disabled = false,
}: NotificationCardProps) {
  const createdAt = new Date(notification.createdAt).toLocaleString("vi-VN");
  const actionUrl =
    typeof notification.metadata?.action_url === "string"
      ? notification.metadata.action_url
      : null;

  return (
    <article
      className={`rounded-2xl border p-4 transition-all ${
        notification.isRead
          ? "border-stone-200 bg-white"
          : "border-stone-300 bg-stone-50/70 shadow-sm"
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`mt-1.5 inline-block h-2.5 w-2.5 shrink-0 rounded-full ${
            notification.isRead ? "bg-stone-300" : "bg-stone-900"
          }`}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <NotificationTypeBadge type={notification.type} />
            <NotificationReadBadge isRead={notification.isRead} />
            <span className="rounded-full border border-stone-200 bg-white px-2 py-1 text-[11px] font-medium text-stone-600">
              {notification.channel}
            </span>
          </div>
          <h3 className="mt-2 text-sm font-semibold text-stone-900">{notification.title}</h3>
          <p className="mt-1 whitespace-pre-line text-sm leading-6 text-stone-700">
            {notification.content}
          </p>
          {!notification.isRead && onMarkAsRead ? (
            <div className="mt-3">
              <button
                type="button"
                disabled={disabled}
                onClick={() => void onMarkAsRead(notification.id)}
                className="rounded-full border border-stone-300 px-3 py-1.5 text-xs font-semibold text-stone-700 transition-colors hover:bg-stone-100 disabled:opacity-50"
              >
                Đánh dấu đã đọc
              </button>
            </div>
          ) : null}
          {actionUrl ? (
            <div className="mt-2">
              <Link
                href={actionUrl}
                className="inline-flex rounded-full border border-stone-300 px-3 py-1.5 text-xs font-semibold text-stone-700 transition-colors hover:bg-stone-100"
              >
                Xem chi tiết
              </Link>
            </div>
          ) : null}
        </div>
        <time className="shrink-0 text-xs text-stone-500">
          {createdAt}
        </time>
      </div>
    </article>
  );
}
