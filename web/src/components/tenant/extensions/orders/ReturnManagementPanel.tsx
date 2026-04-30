import type { ReturnDetail, ReturnStatus } from "@/lib/returns-api";
import type { AdminOrderDetail } from "@/lib/admin-orders-api";
import ReturnStatusBadge from "./ReturnStatusBadge";

type ManageableReturnStatus = Exclude<ReturnStatus, "REQUESTED">;
type InspectionDecision = "RESTOCK" | "DISCARD";

type Props = {
  returnItem: ReturnDetail | null;
  orderDetail: AdminOrderDetail | null;
  manageableStatuses: ManageableReturnStatus[];
  nextStatus: ManageableReturnStatus;
  onChangeNextStatus: (status: ManageableReturnStatus) => void;
  note: string;
  onChangeNote: (value: string) => void;
  inspectionDecision: InspectionDecision;
  onChangeInspectionDecision: (value: InspectionDecision) => void;
  loading: boolean;
  disabled?: boolean;
  onUpdateStatus: () => void;
  onRunInspection: () => void;
};

export default function ReturnManagementPanel({
  returnItem,
  orderDetail,
  manageableStatuses,
  nextStatus,
  onChangeNextStatus,
  note,
  onChangeNote,
  inspectionDecision,
  onChangeInspectionDecision,
  loading,
  disabled = false,
  onUpdateStatus,
  onRunInspection,
}: Props) {
  return (
    <div className="space-y-2 rounded-lg border border-stone-200 bg-stone-50 p-3">
      <p className="text-xs font-semibold text-stone-900">Return Management</p>
      {returnItem ? (
        <>
          <div className="flex items-center justify-between">
            <p className="text-xs text-stone-700">Return #{returnItem.id}</p>
            <ReturnStatusBadge status={returnItem.status} />
          </div>
          <p className="text-xs text-stone-600">Ly do: {returnItem.reason}</p>
          <p className="text-xs text-stone-600">Ghi chu: {returnItem.note || "-"}</p>

          <select
            value={nextStatus}
            onChange={(event) => onChangeNextStatus(event.target.value as ManageableReturnStatus)}
            disabled={loading || disabled}
            className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
          >
            {manageableStatuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <textarea
            value={note}
            onChange={(event) => onChangeNote(event.target.value)}
            rows={2}
            placeholder="Ghi chu xu ly return"
            disabled={loading || disabled}
            className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
          />
          <button
            type="button"
            disabled={loading || disabled}
            onClick={onUpdateStatus}
            className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100 disabled:opacity-50"
          >
            {loading ? "Dang cap nhat..." : "Cap nhat return"}
          </button>

          {returnItem.status === "RECEIVED" && orderDetail ? (
            <div className="space-y-2 rounded-md border border-amber-200 bg-amber-50 p-3">
              <p className="text-xs font-semibold text-amber-800">Kiem tra hang hoan tra</p>
              <p className="text-xs text-amber-700">
                Sau khi nhan hang, can quyet dinh nhap lai kho (hang con moi) hoac loai bo (hang hu hong).
              </p>
              <select
                value={inspectionDecision}
                onChange={(event) => onChangeInspectionDecision(event.target.value as InspectionDecision)}
                disabled={loading || disabled}
                className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
              >
                <option value="RESTOCK">Hang con moi - Nhap lai kho</option>
                <option value="DISCARD">Hang hu hong - Loai bo</option>
              </select>
              <button
                type="button"
                disabled={loading || disabled}
                onClick={onRunInspection}
                className="w-full rounded-md bg-stone-900 px-3 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-50"
              >
                {loading ? "Dang xu ly..." : "Xac nhan kiem tra hang"}
              </button>
            </div>
          ) : null}
        </>
      ) : (
        <p className="text-xs text-stone-500">Chua co return cho don hang nay.</p>
      )}
    </div>
  );
}
