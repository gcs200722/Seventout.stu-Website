import FulfillmentStatusBadge from "@/components/orders/FulfillmentStatusBadge";
import type { FulfillmentDetail } from "@/lib/fulfillment-api";

type FulfillmentSummaryCardProps = {
  fulfillment: FulfillmentDetail | null;
  loading?: boolean;
  emptyLabel?: string;
};

function formatDate(value: string | null) {
  if (!value) {
    return "-";
  }
  return new Date(value).toLocaleString("vi-VN");
}

export default function FulfillmentSummaryCard({
  fulfillment,
  loading = false,
  emptyLabel = "Chưa tạo vận đơn",
}: FulfillmentSummaryCardProps) {
  return (
    <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700">
      <h3 className="text-sm font-semibold text-stone-900">Fulfillment / Vận chuyển</h3>
      {loading ? <p className="mt-2 text-sm text-stone-500">Đang tải thông tin vận chuyển...</p> : null}
      {!loading && !fulfillment ? <p className="mt-2 text-sm text-stone-500">{emptyLabel}</p> : null}
      {!loading && fulfillment ? (
        <div className="mt-3 space-y-2">
          <div>
            <span className="text-xs font-medium text-stone-600">Trạng thái:</span>{" "}
            <FulfillmentStatusBadge status={fulfillment.status} />
          </div>
          <p>
            <span className="font-semibold text-stone-900">Mã vận đơn:</span>{" "}
            {fulfillment.trackingCode?.trim() || "-"}
          </p>
          <p>
            <span className="font-semibold text-stone-900">Đơn vị vận chuyển:</span>{" "}
            {fulfillment.shippingProvider?.trim() || "-"}
          </p>
          <p>
            <span className="font-semibold text-stone-900">Ngày gửi hàng:</span>{" "}
            {formatDate(fulfillment.shippedAt)}
          </p>
          <p>
            <span className="font-semibold text-stone-900">Ngày giao hàng:</span>{" "}
            {formatDate(fulfillment.deliveredAt)}
          </p>
          <p>
            <span className="font-semibold text-stone-900">Ghi chú:</span> {fulfillment.note?.trim() || "-"}
          </p>
        </div>
      ) : null}
    </div>
  );
}
