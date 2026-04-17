import type { RefundDetail } from "@/lib/refunds-api";
import { formatVnd } from "@/lib/products-api";
import RefundStatusBadge from "./RefundStatusBadge";

export default function RefundManagementPanel({ refundItem }: { refundItem: RefundDetail | null }) {
  return (
    <div className="space-y-2 rounded-lg border border-stone-200 bg-stone-50 p-3">
      <p className="text-xs font-semibold text-stone-900">Refund Management</p>
      <p className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-700">
        Refund se xu ly sau theo doi soat doanh thu. Tam thoi module nay chi ghi nhan trang thai.
      </p>
      {refundItem ? (
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <p className="text-xs text-stone-700">Refund #{refundItem.id}</p>
            <RefundStatusBadge status={refundItem.status} />
          </div>
          <p className="text-xs text-stone-600">Amount: {formatVnd(refundItem.amount)}</p>
          <p className="text-xs text-stone-600">Method: {refundItem.method}</p>
        </div>
      ) : (
        <p className="text-xs text-stone-500">Chua co refund cho return nay.</p>
      )}
    </div>
  );
}
