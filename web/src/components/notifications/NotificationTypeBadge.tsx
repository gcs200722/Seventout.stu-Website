import type { NotificationType } from "@/lib/notifications-api";

const TYPE_TONE: Record<NotificationType, string> = {
  ORDER_CREATED: "bg-sky-50 text-sky-700 border-sky-200",
  PAYMENT_SUCCESS: "bg-emerald-50 text-emerald-700 border-emerald-200",
  PAYMENT_FAILED: "bg-rose-50 text-rose-700 border-rose-200",
  FULFILLMENT_SHIPPED: "bg-violet-50 text-violet-700 border-violet-200",
  FULFILLMENT_DELIVERED: "bg-indigo-50 text-indigo-700 border-indigo-200",
};

const TYPE_LABEL: Record<NotificationType, string> = {
  ORDER_CREATED: "Đơn hàng mới",
  PAYMENT_SUCCESS: "Thanh toán thành công",
  PAYMENT_FAILED: "Thanh toán thất bại",
  FULFILLMENT_SHIPPED: "Đã gửi hàng",
  FULFILLMENT_DELIVERED: "Đã giao hàng",
};

export default function NotificationTypeBadge({ type }: { type: NotificationType }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${TYPE_TONE[type]}`}
    >
      {TYPE_LABEL[type]}
    </span>
  );
}
