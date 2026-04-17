import { formatVnd } from "@/lib/products-api";
import type { RefundDetail } from "@/lib/refunds-api";
import RefundStatusBadge from "./RefundStatusBadge";

type Props = {
  item: RefundDetail | null;
  loading?: boolean;
};

export default function RefundSummaryCard({ item, loading = false }: Props) {
  if (loading) {
    return <div className="rounded-xl border border-stone-200 bg-stone-50 p-3 text-xs text-stone-500">Dang tai refund...</div>;
  }
  if (!item) {
    return (
      <div className="rounded-xl border border-stone-200 bg-stone-50 p-3 text-xs text-stone-600">
        Chua co yeu cau hoan tien.
      </div>
    );
  }
  return (
    <div className="space-y-2 rounded-xl border border-stone-200 bg-stone-50 p-3 text-xs text-stone-700">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold text-stone-900">Refund #{item.id}</p>
        <RefundStatusBadge status={item.status} />
      </div>
      <p>
        <span className="font-semibold text-stone-900">So tien:</span> {formatVnd(item.amount)}
      </p>
      <p>
        <span className="font-semibold text-stone-900">Phuong thuc:</span> {item.method}
      </p>
    </div>
  );
}
