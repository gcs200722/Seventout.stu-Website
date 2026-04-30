import type { PaymentStatus } from "@/lib/orders-api";

const STATUS_TONE: Record<PaymentStatus, string> = {
  UNPAID: "bg-stone-100 text-stone-700 border-stone-200",
  PAID: "bg-emerald-50 text-emerald-700 border-emerald-200",
  FAILED: "bg-rose-50 text-rose-700 border-rose-200",
  REFUNDED: "bg-sky-50 text-sky-700 border-sky-200",
};

type PaymentStatusBadgeProps = {
  status: PaymentStatus;
};

export default function PaymentStatusBadge({ status }: PaymentStatusBadgeProps) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${STATUS_TONE[status]}`}
    >
      {status}
    </span>
  );
}
