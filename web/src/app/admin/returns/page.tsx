"use client";

import { useEffect, useMemo, useState } from "react";

import RefundManagementPanel from "@/components/orders/RefundManagementPanel";
import ReturnManagementPanel from "@/components/orders/ReturnManagementPanel";
import { useAuth } from "@/components/auth/AuthProvider";
import { getAdminOrderDetail, type AdminOrderDetail } from "@/lib/admin-orders-api";
import { adjustAdminInventory } from "@/lib/inventory-api";
import { formatVnd } from "@/lib/products-api";
import { listRefunds, type RefundDetail } from "@/lib/refunds-api";
import {
  listReturns,
  type ReturnDetail,
  type ReturnStatus,
  updateReturnStatus,
} from "@/lib/returns-api";

const PAGE_LIMIT = 10;
type ManageableReturnStatus = Exclude<ReturnStatus, "REQUESTED">;
type InspectionDecision = "RESTOCK" | "DISCARD";

const MANAGEABLE_RETURN_STATUSES: ManageableReturnStatus[] = [
  "APPROVED",
  "RECEIVED",
  "COMPLETED",
  "REJECTED",
  "CANCELLED",
];

export default function AdminReturnsPage() {
  const { role, permissions } = useAuth();
  const canUpdateReturn = role === "ADMIN" || role === "STAFF" || permissions.includes("RETURN_UPDATE");

  const [returns, setReturns] = useState<ReturnDetail[]>([]);
  const [selectedReturnId, setSelectedReturnId] = useState<string>("");
  const [selectedReturn, setSelectedReturn] = useState<ReturnDetail | null>(null);
  const [orderDetail, setOrderDetail] = useState<AdminOrderDetail | null>(null);
  const [refundItem, setRefundItem] = useState<RefundDetail | null>(null);
  const [nextReturnStatus, setNextReturnStatus] = useState<ManageableReturnStatus>("APPROVED");
  const [returnActionNote, setReturnActionNote] = useState("");
  const [inspectionDecision, setInspectionDecision] = useState<InspectionDecision>("RESTOCK");
  const [statusFilter, setStatusFilter] = useState<"" | ReturnStatus>("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_LIMIT)), [total]);

  useEffect(() => {
    async function loadReturns() {
      try {
        setLoading(true);
        setError(null);
        const response = await listReturns({
          page,
          limit: PAGE_LIMIT,
          status: statusFilter || undefined,
        });
        setReturns(response.items);
        setTotal(response.pagination.total);
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Khong tai duoc danh sach return.");
      } finally {
        setLoading(false);
      }
    }
    void loadReturns();
  }, [page, statusFilter]);

  async function handleSelectReturn(returnItem: ReturnDetail) {
    setSelectedReturnId(returnItem.id);
    setSelectedReturn(returnItem);
    setInspectionDecision("RESTOCK");
    if (returnItem.status !== "REQUESTED") {
      setNextReturnStatus(returnItem.status);
    }
    setDetailLoading(true);
    setError(null);
    try {
      const [order, refunds] = await Promise.all([
        getAdminOrderDetail(returnItem.orderId),
        listRefunds({ page: 1, limit: 5, order_id: returnItem.orderId }).catch(() => ({
          items: [],
          pagination: { page: 1, limit: 5, total: 0 },
        })),
      ]);
      setOrderDetail(order);
      setRefundItem(refunds.items[0] ?? null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Khong tai duoc chi tiet return.");
    } finally {
      setDetailLoading(false);
    }
  }

  async function reloadSelectedReturn() {
    if (!selectedReturnId || !selectedReturn) return;
    const refreshed = await listReturns({ page: 1, limit: 100, status: statusFilter || undefined }).catch(() => ({
      items: [],
      pagination: { page: 1, limit: 100, total: 0 },
    }));
    const matched = refreshed.items.find((item) => item.id === selectedReturnId) ?? null;
    if (!matched) return;
    await handleSelectReturn(matched);
  }

  async function handleUpdateReturnStatus() {
    if (!selectedReturn || !canUpdateReturn) return;
    try {
      setActionLoading(true);
      setError(null);
      setSuccess(null);
      await updateReturnStatus(selectedReturn.id, {
        status: nextReturnStatus,
        note: returnActionNote.trim() || undefined,
      });
      await reloadSelectedReturn();
      setSuccess("Da cap nhat return status.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Khong the cap nhat return status.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRunReturnInspection() {
    if (!selectedReturn || !orderDetail || !canUpdateReturn) return;
    if (selectedReturn.status !== "RECEIVED") {
      setError("Chi co the kiem tra hang khi return o trang thai RECEIVED.");
      return;
    }
    try {
      setActionLoading(true);
      setError(null);
      setSuccess(null);
      if (inspectionDecision === "RESTOCK") {
        await Promise.all(
          orderDetail.items.map((item) =>
            adjustAdminInventory(item.product_id, {
              channel: "internal",
              type: "IN",
              quantity: item.quantity,
              reason: `Return ${selectedReturn.id} restock`,
            }),
          ),
        );
      }
      await updateReturnStatus(selectedReturn.id, {
        status: "COMPLETED",
        note:
          inspectionDecision === "RESTOCK"
            ? "[Inspection] Restocked to inventory"
            : "[Inspection] Discarded - damaged condition",
      });
      await reloadSelectedReturn();
      setSuccess(
        inspectionDecision === "RESTOCK"
          ? "Da kiem tra va nhap lai kho."
          : "Da kiem tra va loai bo hang hu hong.",
      );
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Khong the xu ly kiem tra hang.");
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <section className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold">Quan ly don hoan</h1>
        <p className="mt-1 text-sm text-stone-600">
          Xu ly luong return: duyet, nhan hang, kiem tra hang, nhap kho/loai bo.
        </p>
      </header>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>
      ) : null}
      {success ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          {success}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4 rounded-xl border border-stone-200 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-stone-900">Danh sach return</p>
            <select
              value={statusFilter}
              onChange={(event) => {
                setPage(1);
                setStatusFilter(event.target.value as "" | ReturnStatus);
              }}
              className="rounded-md border border-stone-300 px-3 py-2 text-xs"
            >
              <option value="">Tat ca trang thai</option>
              <option value="REQUESTED">REQUESTED</option>
              <option value="APPROVED">APPROVED</option>
              <option value="RECEIVED">RECEIVED</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="REJECTED">REJECTED</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
          </div>

          {loading ? <p className="text-sm text-stone-500">Dang tai return...</p> : null}

          <div className="space-y-2">
            {returns.length === 0 ? (
              <p className="rounded-md border border-stone-200 bg-stone-50 p-3 text-xs text-stone-600">
                Chua co return.
              </p>
            ) : (
              returns.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => void handleSelectReturn(item)}
                  className={`w-full rounded-lg border p-3 text-left ${
                    selectedReturnId === item.id
                      ? "border-stone-900 bg-stone-900 text-white"
                      : "border-stone-200 bg-stone-50 text-stone-800 hover:bg-white"
                  }`}
                >
                  <p className="text-xs font-semibold">Return #{item.id}</p>
                  <p className="mt-1 text-xs">Order: {item.orderId}</p>
                  <p className="mt-1 text-xs">Status: {item.status}</p>
                  <p className="mt-1 text-xs truncate">Reason: {item.reason}</p>
                </button>
              ))
            )}
          </div>

          <div className="flex items-center justify-between border-t border-stone-200 pt-3 text-xs text-stone-600">
            <span>
              Trang {page}/{totalPages} - Tong {total}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                className="rounded-md border border-stone-300 px-3 py-1.5 disabled:opacity-40"
              >
                Truoc
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((prev) => prev + 1)}
                className="rounded-md border border-stone-300 px-3 py-1.5 disabled:opacity-40"
              >
                Sau
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-4 rounded-xl border border-stone-200 bg-white p-4">
          {detailLoading ? <p className="text-sm text-stone-500">Dang tai chi tiet return...</p> : null}
          {!detailLoading && selectedReturn ? (
            <>
              {orderDetail ? (
                <div className="rounded-lg border border-stone-200 bg-stone-50 p-3 text-xs text-stone-700">
                  <p className="font-semibold text-stone-900">Order lien ket</p>
                  <p className="mt-1">Order ID: {orderDetail.id}</p>
                  <p className="mt-1">Tong tien: {formatVnd(orderDetail.total_amount)}</p>
                </div>
              ) : null}

              <ReturnManagementPanel
                returnItem={selectedReturn}
                orderDetail={orderDetail}
                manageableStatuses={MANAGEABLE_RETURN_STATUSES}
                nextStatus={nextReturnStatus}
                onChangeNextStatus={setNextReturnStatus}
                note={returnActionNote}
                onChangeNote={setReturnActionNote}
                inspectionDecision={inspectionDecision}
                onChangeInspectionDecision={setInspectionDecision}
                loading={actionLoading}
                disabled={!canUpdateReturn}
                onUpdateStatus={() => void handleUpdateReturnStatus()}
                onRunInspection={() => void handleRunReturnInspection()}
              />

              <RefundManagementPanel refundItem={refundItem} />
            </>
          ) : (
            <p className="rounded-md border border-stone-200 bg-stone-50 p-3 text-xs text-stone-600">
              Chon mot return de xem va xu ly.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
