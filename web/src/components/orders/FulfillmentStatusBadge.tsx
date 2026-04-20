import type { FulfillmentStatus } from "@/lib/fulfillment-api";

const STATUS_LABEL: Record<FulfillmentStatus, string> = {
  PENDING: "Chờ xử lý",
  CONFIRMED: "Đã xác nhận",
  PACKING: "Đang đóng gói",
  SHIPPED: "Đang giao",
  DELIVERED: "Đã giao",
  CANCELLED: "Đã hủy",
  FAILED_DELIVERY: "Giao thất bại",
};

const STATUS_TONE: Record<FulfillmentStatus, string> = {
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  CONFIRMED: "bg-sky-50 text-sky-700 border-sky-200",
  PACKING: "bg-indigo-50 text-indigo-700 border-indigo-200",
  SHIPPED: "bg-violet-50 text-violet-700 border-violet-200",
  DELIVERED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  CANCELLED: "bg-rose-50 text-rose-700 border-rose-200",
  FAILED_DELIVERY: "bg-rose-50 text-rose-700 border-rose-200",
};

type FulfillmentStatusBadgeProps = {
  status: FulfillmentStatus;
  showCode?: boolean;
};

export function getFulfillmentStatusLabel(status: FulfillmentStatus) {
  return STATUS_LABEL[status];
}

export default function FulfillmentStatusBadge({
  status,
  showCode = true,
}: FulfillmentStatusBadgeProps) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${STATUS_TONE[status]}`}
    >
      {showCode ? `${status} - ${STATUS_LABEL[status]}` : STATUS_LABEL[status]}
    </span>
  );
}
