import type { ReturnDetail } from "@/lib/returns-api";
import ReturnStatusBadge from "./ReturnStatusBadge";

type Props = {
  item: ReturnDetail | null;
  loading?: boolean;
};

export default function ReturnRequestCard({ item, loading = false }: Props) {
  if (loading) {
    return <div className="rounded-xl border border-stone-200 bg-stone-50 p-3 text-xs text-stone-500">Dang tai return...</div>;
  }

  if (!item) {
    return (
      <div className="rounded-xl border border-stone-200 bg-stone-50 p-3 text-xs text-stone-600">
        Chua co yeu cau tra hang.
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-xl border border-stone-200 bg-stone-50 p-3 text-xs text-stone-700">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold text-stone-900">Return #{item.id}</p>
        <ReturnStatusBadge status={item.status} />
      </div>
      <p>
        <span className="font-semibold text-stone-900">Ly do:</span> {item.reason}
      </p>
      <p>
        <span className="font-semibold text-stone-900">Ghi chu:</span> {item.note || "-"}
      </p>
    </div>
  );
}
