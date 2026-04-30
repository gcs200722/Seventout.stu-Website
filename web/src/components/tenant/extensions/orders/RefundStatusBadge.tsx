import type { RefundStatus } from "@/lib/refunds-api";

const STATUS_STYLE: Record<RefundStatus, string> = {
  PENDING: "border-amber-200 bg-amber-50 text-amber-700",
  PROCESSING: "border-sky-200 bg-sky-50 text-sky-700",
  SUCCESS: "border-emerald-200 bg-emerald-50 text-emerald-700",
  FAILED: "border-rose-200 bg-rose-50 text-rose-700",
};

export default function RefundStatusBadge({ status }: { status: RefundStatus }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-wide ${STATUS_STYLE[status]}`}
    >
      {status}
    </span>
  );
}
