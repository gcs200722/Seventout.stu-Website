import type { ReturnStatus } from "@/lib/returns-api";

const STATUS_STYLE: Record<ReturnStatus, string> = {
  REQUESTED: "border-amber-200 bg-amber-50 text-amber-700",
  APPROVED: "border-sky-200 bg-sky-50 text-sky-700",
  RECEIVED: "border-indigo-200 bg-indigo-50 text-indigo-700",
  COMPLETED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  REJECTED: "border-rose-200 bg-rose-50 text-rose-700",
  CANCELLED: "border-stone-300 bg-stone-100 text-stone-700",
};

export default function ReturnStatusBadge({ status }: { status: ReturnStatus }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-wide ${STATUS_STYLE[status]}`}
    >
      {status}
    </span>
  );
}
