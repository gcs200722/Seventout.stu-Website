"use client";

import { useEffect, useMemo, useState } from "react";

import FulfillmentSummaryCard from "@/components/orders/FulfillmentSummaryCard";
import OrderStatusBadge from "@/components/orders/OrderStatusBadge";
import PaymentStatusBadge from "@/components/orders/PaymentStatusBadge";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  getAdminOrderDetail,
  listAdminOrders,
  type ManageableOrderStatus,
  updateAdminOrderStatus,
} from "@/lib/admin-orders-api";
import {
  handleFailedDeliveryAction,
  getFulfillmentByOrderId,
  updateFulfillmentStatus,
  type FailedDeliveryAction,
  type FulfillmentDetail,
  type FulfillmentStatus,
} from "@/lib/fulfillment-api";
import type { OrderStatus, PaymentStatus } from "@/lib/orders-api";
import { formatVnd } from "@/lib/products-api";

const PAGE_LIMIT = 10;
const MANAGEABLE_ORDER_STATUSES: ManageableOrderStatus[] = [
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "COMPLETED",
];

const MANAGEABLE_FULFILLMENT_STATUSES: FulfillmentStatus[] = [
  "CONFIRMED",
  "PACKING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "FAILED_DELIVERY",
];

const FAILED_DELIVERY_ACTIONS: FailedDeliveryAction[] = [
  "RETRY_DELIVERY",
  "CANCEL_ORDER",
  "RETURN_TO_WAREHOUSE",
];

function formatPaymentMethod(method: "COD" | "VNPAY" | "STRIPE" | null) {
  if (!method) return "-";
  if (method === "COD") return "COD";
  if (method === "VNPAY") return "VNPay";
  return "Stripe";
}

function toManageableOrderStatus(status: OrderStatus): ManageableOrderStatus {
  if (status === "PENDING" || status === "CONFIRMED") {
    return "CONFIRMED";
  }
  if (status === "PROCESSING") {
    return "PROCESSING";
  }
  if (status === "SHIPPED") {
    return "SHIPPED";
  }
  return "COMPLETED";
}

function toManageableFulfillmentStatus(status: FulfillmentStatus): FulfillmentStatus {
  if (MANAGEABLE_FULFILLMENT_STATUSES.includes(status)) {
    return status;
  }
  return "CONFIRMED";
}

export default function AdminOrdersPage() {
  const { role, permissions } = useAuth();
  const [orders, setOrders] = useState<
    Array<{
      id: string;
      customerName: string;
      shippingAddress: string;
      note: string;
      createdAt: string;
      status: OrderStatus;
      paymentStatus: PaymentStatus;
      paymentMethod: "COD" | "VNPAY" | "STRIPE" | null;
      totalAmount: number;
    }>
  >([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string>("");
  const [orderDetail, setOrderDetail] = useState<Awaited<ReturnType<typeof getAdminOrderDetail>> | null>(null);
  const [nextStatus, setNextStatus] = useState<ManageableOrderStatus>("CONFIRMED");
  const [fulfillment, setFulfillment] = useState<FulfillmentDetail | null>(null);
  const [fulfillmentLoading, setFulfillmentLoading] = useState(false);
  const [fulfillmentError, setFulfillmentError] = useState<string | null>(null);
  const [nextFulfillmentStatus, setNextFulfillmentStatus] = useState<FulfillmentStatus>("CONFIRMED");
  const [failedDeliveryAction, setFailedDeliveryAction] = useState<FailedDeliveryAction>("RETRY_DELIVERY");
  const [failedDeliveryActionNote, setFailedDeliveryActionNote] = useState("");
  const [nextTrackingCode, setNextTrackingCode] = useState("");
  const [nextShippingProvider, setNextShippingProvider] = useState("");
  const [nextFulfillmentNote, setNextFulfillmentNote] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<"" | OrderStatus>("");
  const [paymentFilter, setPaymentFilter] = useState<"" | PaymentStatus>("");
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_LIMIT)), [total]);
  const canUpdateFulfillment =
    role === "ADMIN" || role === "STAFF" || permissions.includes("FULFILLMENT_UPDATE");

  useEffect(() => {
    async function loadOrders() {
      try {
        setLoading(true);
        setError(null);
        const response = await listAdminOrders({
          page,
          limit: PAGE_LIMIT,
          status: statusFilter || undefined,
          payment_status: paymentFilter || undefined,
        });
        setOrders(
          response.data.map((item) => ({
            id: item.id,
            customerName: item.shippingAddress.full_name || "Unknown",
            shippingAddress: [
              item.shippingAddress.address_line,
              item.shippingAddress.ward,
              item.shippingAddress.city,
              item.shippingAddress.country,
            ]
              .filter(Boolean)
              .join(", "),
            note: item.note?.trim() || "",
            createdAt: item.createdAt,
            status: item.status,
            paymentStatus: item.paymentStatus,
            paymentMethod: item.paymentMethod ?? null,
            totalAmount: item.totalAmount,
          })),
        );
        setTotal(response.pagination.total);
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Không tải được dữ liệu đơn hàng.");
      } finally {
        setLoading(false);
      }
    }

    void loadOrders();
  }, [page, paymentFilter, statusFilter]);

  async function handleSelectOrder(orderId: string) {
    try {
      setDetailLoading(true);
      setFulfillmentLoading(true);
      setError(null);
      setFulfillmentError(null);
      setOrderDetail(null);
      const [detail, fulfillmentDetail] = await Promise.all([
        getAdminOrderDetail(orderId),
        getFulfillmentByOrderId(orderId).catch((requestError) => {
          if (
            requestError instanceof Error &&
            /fulfillment not found|not found|404/i.test(requestError.message)
          ) {
            return null;
          }
          throw requestError;
        }),
      ]);
      setSelectedOrderId(orderId);
      setOrderDetail(detail);
      setNextStatus(toManageableOrderStatus(detail.status));
      setFulfillment(fulfillmentDetail);
      if (fulfillmentDetail) {
        setNextFulfillmentStatus(toManageableFulfillmentStatus(fulfillmentDetail.status));
        setFailedDeliveryAction("RETRY_DELIVERY");
        setFailedDeliveryActionNote("");
        setNextTrackingCode(fulfillmentDetail.trackingCode ?? "");
        setNextShippingProvider(fulfillmentDetail.shippingProvider ?? "");
        setNextFulfillmentNote(fulfillmentDetail.note ?? "");
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không tải được chi tiết đơn hàng.");
    } finally {
      setDetailLoading(false);
      setFulfillmentLoading(false);
    }
  }

  async function handleUpdateStatus() {
    if (!selectedOrderId) {
      return;
    }
    try {
      setActionLoading(true);
      setError(null);
      setSuccess(null);
      await updateAdminOrderStatus(selectedOrderId, nextStatus);
      const detail = await getAdminOrderDetail(selectedOrderId);
      setOrderDetail(detail);
      const refreshed = await listAdminOrders({
        page,
        limit: PAGE_LIMIT,
        status: statusFilter || undefined,
        payment_status: paymentFilter || undefined,
      });
      setOrders(
        refreshed.data.map((item) => ({
          id: item.id,
          customerName: item.shippingAddress.full_name || "Unknown",
          shippingAddress: [
            item.shippingAddress.address_line,
            item.shippingAddress.ward,
            item.shippingAddress.city,
            item.shippingAddress.country,
          ]
            .filter(Boolean)
            .join(", "),
          note: item.note?.trim() || "",
          createdAt: item.createdAt,
          status: item.status,
          paymentStatus: item.paymentStatus,
          paymentMethod: item.paymentMethod ?? null,
          totalAmount: item.totalAmount,
        })),
      );
      setTotal(refreshed.pagination.total);
      setSuccess("Đã cập nhật trạng thái đơn hàng.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể cập nhật trạng thái.");
    } finally {
      setActionLoading(false);
    }
  }

  function handleCloseDetailModal() {
    setSelectedOrderId("");
    setOrderDetail(null);
    setFulfillment(null);
    setFulfillmentError(null);
  }

  const isStatusUpdateLocked = orderDetail?.status === "CANCELED";
  const isOrderStatusControlledByFulfillment = Boolean(fulfillment);
  const isOrderStatusDropdownLocked =
    isStatusUpdateLocked || isOrderStatusControlledByFulfillment;
  const isFulfillmentUpdateLocked = !fulfillment || !canUpdateFulfillment;
  const canEditTrackingCode =
    nextFulfillmentStatus === "SHIPPED" && !isFulfillmentUpdateLocked;

  async function reloadSelectedOrderDetail() {
    if (!selectedOrderId) {
      return;
    }
    setDetailLoading(true);
    setFulfillmentLoading(true);
    setFulfillmentError(null);
    try {
      const [detail, fulfillmentDetail] = await Promise.all([
        getAdminOrderDetail(selectedOrderId),
        getFulfillmentByOrderId(selectedOrderId).catch((requestError) => {
          if (
            requestError instanceof Error &&
            /fulfillment not found|not found|404/i.test(requestError.message)
          ) {
            return null;
          }
          throw requestError;
        }),
      ]);
      setOrderDetail(detail);
      setNextStatus(toManageableOrderStatus(detail.status));
      setFulfillment(fulfillmentDetail);
      if (fulfillmentDetail) {
        setNextFulfillmentStatus(toManageableFulfillmentStatus(fulfillmentDetail.status));
        setFailedDeliveryAction("RETRY_DELIVERY");
        setFailedDeliveryActionNote("");
        setNextTrackingCode(fulfillmentDetail.trackingCode ?? "");
        setNextShippingProvider(fulfillmentDetail.shippingProvider ?? "");
        setNextFulfillmentNote(fulfillmentDetail.note ?? "");
      }
    } catch (requestError) {
      setFulfillmentError(
        requestError instanceof Error ? requestError.message : "Không tải được trạng thái vận chuyển.",
      );
    } finally {
      setDetailLoading(false);
      setFulfillmentLoading(false);
    }
  }

  async function handleUpdateFulfillmentStatus() {
    if (!fulfillment || !canUpdateFulfillment) {
      return;
    }
    if (nextFulfillmentStatus === "SHIPPED" && nextTrackingCode.trim().length === 0) {
      setFulfillmentError("Vui lòng nhập tracking code trước khi chuyển sang SHIPPED.");
      return;
    }
    try {
      setActionLoading(true);
      setError(null);
      setSuccess(null);
      setFulfillmentError(null);
      const normalizedTrackingCode = nextTrackingCode.trim();
      await updateFulfillmentStatus(fulfillment.id, {
        status: nextFulfillmentStatus,
        tracking_code:
          nextFulfillmentStatus === "SHIPPED" && normalizedTrackingCode
            ? normalizedTrackingCode
            : undefined,
        shipping_provider: nextShippingProvider.trim() || undefined,
        note: nextFulfillmentNote.trim() || undefined,
      });
      await reloadSelectedOrderDetail();
      setSuccess("Đã cập nhật trạng thái fulfillment.");
    } catch (requestError) {
      setFulfillmentError(
        requestError instanceof Error ? requestError.message : "Không thể cập nhật fulfillment.",
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function handleFailedDeliveryResolution() {
    if (!fulfillment || !canUpdateFulfillment) {
      return;
    }
    if (fulfillment.status !== "FAILED_DELIVERY") {
      return;
    }
    try {
      setActionLoading(true);
      setError(null);
      setSuccess(null);
      setFulfillmentError(null);
      await handleFailedDeliveryAction(fulfillment.id, {
        action: failedDeliveryAction,
        note: failedDeliveryActionNote.trim() || undefined,
      });
      await reloadSelectedOrderDetail();
      setSuccess("Đã xử lý hành động sau FAILED_DELIVERY.");
    } catch (requestError) {
      setFulfillmentError(
        requestError instanceof Error ? requestError.message : "Không thể xử lý failed delivery action.",
      );
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <section className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold">Quản lý đơn hàng</h1>
        <p className="mt-1 text-sm text-stone-600">
          Quản lý đơn hàng với filter, phân trang, xem chi tiết và cập nhật trạng thái.
        </p>
      </header>

      {loading ? <p className="text-sm text-stone-500">Đang tải dữ liệu...</p> : null}

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          {success}
        </div>
      ) : null}

      {!loading && !error ? (
        <div className="space-y-4 rounded-xl border border-stone-200 bg-white p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-stone-200 bg-stone-50 p-3">
              <p className="text-xs text-stone-500">Tổng đơn</p>
              <p className="mt-1 text-lg font-semibold text-stone-900">{total}</p>
            </div>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
              <p className="text-xs text-emerald-700">Đã hoàn tất</p>
              <p className="mt-1 text-lg font-semibold text-emerald-800">
                {orders.filter((order) => order.status === "COMPLETED").length}
              </p>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="text-xs text-amber-700">Chờ xử lý</p>
              <p className="mt-1 text-lg font-semibold text-amber-800">
                {
                  orders.filter((order) =>
                    ["PENDING", "CONFIRMED", "PROCESSING"].includes(order.status),
                  ).length
                }
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <select
              value={statusFilter}
              onChange={(event) => {
                setPage(1);
                setStatusFilter(event.target.value as "" | OrderStatus);
              }}
              className="rounded-md border border-stone-300 px-3 py-2 text-xs"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="PENDING">PENDING</option>
              <option value="CONFIRMED">CONFIRMED</option>
              <option value="PROCESSING">PROCESSING</option>
              <option value="SHIPPED">SHIPPED</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="CANCELED">CANCELED</option>
            </select>
            <select
              value={paymentFilter}
              onChange={(event) => {
                setPage(1);
                setPaymentFilter(event.target.value as "" | PaymentStatus);
              }}
              className="rounded-md border border-stone-300 px-3 py-2 text-xs"
            >
              <option value="">Tất cả thanh toán</option>
              <option value="UNPAID">UNPAID</option>
              <option value="PAID">PAID</option>
              <option value="FAILED">FAILED</option>
              <option value="REFUNDED">REFUNDED</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-stone-200 text-sm">
              <thead className="bg-stone-50 text-left text-xs uppercase tracking-wide text-stone-600">
                <tr>
                  <th className="px-4 py-3">Mã đơn</th>
                  <th className="px-4 py-3">Người đặt</th>
                  <th className="px-4 py-3">Ngày đặt hàng</th>
                  <th className="px-4 py-3">Địa chỉ</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3">Thanh toán</th>
                  <th className="px-4 py-3">Loại payment</th>
                  <th className="px-4 py-3">Note</th>
                  <th className="px-4 py-3">Tổng tiền</th>
                  <th className="px-4 py-3 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 bg-white">
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-6 text-center text-stone-500">
                      Chưa có dữ liệu đơn hàng.
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => (
                    <tr key={order.id}>
                      <td className="px-4 py-3 font-medium text-stone-900">
                        <p className="max-w-[180px] break-words">{order.id}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-stone-700">{order.customerName}</td>
                      <td className="px-4 py-3 text-xs text-stone-600">
                        {new Date(order.createdAt).toLocaleString("vi-VN")}
                      </td>
                      <td className="px-4 py-3 text-xs text-stone-600">
                        <p className="max-w-[220px] break-words">{order.shippingAddress}</p>
                      </td>
                      <td className="px-4 py-3">
                        <OrderStatusBadge status={order.status} />
                      </td>
                      <td className="px-4 py-3">
                        <PaymentStatusBadge status={order.paymentStatus} />
                      </td>
                      <td className="px-4 py-3">{formatPaymentMethod(order.paymentMethod)}</td>
                      <td className="px-4 py-3 text-xs text-stone-600">
                        <p className="max-w-[180px] break-words">{order.note || "-"}</p>
                      </td>
                      <td className="px-4 py-3">{formatVnd(order.totalAmount)}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => void handleSelectOrder(order.id)}
                          className="rounded-md border border-stone-300 px-3 py-1.5 text-xs hover:bg-stone-100"
                        >
                          Chi tiết
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-stone-200 pt-4 text-xs text-stone-600">
            <span>
              Trang {page}/{totalPages} - Tổng {total} đơn
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                className="rounded-md border border-stone-300 px-3 py-1.5 disabled:opacity-40"
              >
                Trước
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
      ) : null}

      {selectedOrderId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4">
          <button
            type="button"
            aria-label="Đóng popup chi tiết đơn hàng"
            className="absolute inset-0"
            onClick={handleCloseDetailModal}
          />
          <div className="relative z-10 w-full max-w-2xl rounded-2xl border border-stone-200 bg-white p-5 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold text-stone-900">Chi tiết đơn hàng</h2>
              <button
                type="button"
                onClick={handleCloseDetailModal}
                className="rounded-md border border-stone-300 px-3 py-1.5 text-xs hover:bg-stone-100"
              >
                Đóng
              </button>
            </div>

            {detailLoading ? <p className="text-sm text-stone-500">Đang tải chi tiết...</p> : null}
            {!detailLoading && orderDetail ? (
              <div className="space-y-3">
                <p className="text-xs text-stone-600">Order ID: {orderDetail.id}</p>
                <p className="text-xs text-stone-600">
                  Trạng thái: {orderDetail.status} | Thanh toán: {orderDetail.payment_status} | Loại:{" "}
                  {orderDetail.payment_method ?? "-"}
                </p>
                <p className="text-sm font-semibold text-stone-900">
                  Tổng tiền: {formatVnd(orderDetail.total_amount)}
                </p>
                <div className="rounded-lg border border-stone-200 bg-stone-50 p-3 text-xs text-stone-700">
                  <p className="font-semibold text-stone-900">Note</p>
                  <p className="mt-1 whitespace-pre-wrap">{orderDetail.note?.trim() || "-"}</p>
                </div>
                <FulfillmentSummaryCard fulfillment={fulfillment} loading={fulfillmentLoading} />
                {fulfillmentError ? (
                  <p className="whitespace-pre-line rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                    {fulfillmentError}
                  </p>
                ) : null}

                <label className="block text-xs font-medium text-stone-700">
                  Cập nhật trạng thái
                  <select
                    value={nextStatus}
                    onChange={(event) => setNextStatus(event.target.value as ManageableOrderStatus)}
                    disabled={isOrderStatusDropdownLocked}
                    className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
                  >
                    {MANAGEABLE_ORDER_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </label>
                {isStatusUpdateLocked ? (
                  <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                    Đơn hàng đã bị khách hủy, thao tác cập nhật trạng thái đã bị khóa.
                  </p>
                ) : null}
                {isOrderStatusControlledByFulfillment ? (
                  <p className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-700">
                    Trạng thái order đang đồng bộ tự động theo fulfillment để tránh xung đột.
                  </p>
                ) : null}
                <button
                  type="button"
                  disabled={actionLoading || isOrderStatusDropdownLocked}
                  onClick={() => void handleUpdateStatus()}
                  className="w-full rounded-md bg-stone-900 px-3 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-50"
                >
                  {actionLoading ? "Đang cập nhật..." : "Cập nhật trạng thái"}
                </button>

                <div className="space-y-2 rounded-lg border border-stone-200 bg-stone-50 p-3">
                  <p className="text-xs font-semibold text-stone-900">Cập nhật trạng thái fulfillment</p>
                  <label className="block text-xs font-medium text-stone-700">
                    Trạng thái fulfillment
                    <select
                      value={nextFulfillmentStatus}
                      onChange={(event) =>
                        setNextFulfillmentStatus(event.target.value as FulfillmentStatus)
                      }
                      disabled={isFulfillmentUpdateLocked}
                      className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
                    >
                      {MANAGEABLE_FULFILLMENT_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </label>
                  {nextFulfillmentStatus === "SHIPPED" ? (
                    <>
                      <label className="block text-xs font-medium text-stone-700">
                        Tracking code
                        <input
                          value={nextTrackingCode}
                          onChange={(event) => setNextTrackingCode(event.target.value)}
                          disabled={!canEditTrackingCode}
                          placeholder="VD: GHN123456789"
                          className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
                        />
                      </label>
                      <label className="block text-xs font-medium text-stone-700">
                        Đơn vị vận chuyển
                        <input
                          value={nextShippingProvider}
                          onChange={(event) => setNextShippingProvider(event.target.value)}
                          disabled={isFulfillmentUpdateLocked}
                          placeholder="VD: GHN"
                          className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
                        />
                      </label>
                      <label className="block text-xs font-medium text-stone-700">
                        Ghi chú thực hiện
                        <textarea
                          value={nextFulfillmentNote}
                          onChange={(event) => setNextFulfillmentNote(event.target.value)}
                          disabled={isFulfillmentUpdateLocked}
                          rows={2}
                          className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
                        />
                      </label>
                    </>
                  ) : null}
                  {!canUpdateFulfillment ? (
                    <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                      Tài khoản hiện tại không có quyền FULFILLMENT_UPDATE.
                    </p>
                  ) : null}
                  <button
                    type="button"
                    disabled={actionLoading || isFulfillmentUpdateLocked}
                    onClick={() => void handleUpdateFulfillmentStatus()}
                    className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100 disabled:opacity-50"
                  >
                    {actionLoading ? "Đang cập nhật..." : "Cập nhật fulfillment"}
                  </button>
                </div>

                {fulfillment?.status === "FAILED_DELIVERY" ? (
                  <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
                    <p className="text-xs font-semibold text-amber-800">Hành động sau FAILED_DELIVERY</p>
                    <label className="block text-xs font-medium text-stone-700">
                      Chọn hành động
                      <select
                        value={failedDeliveryAction}
                        onChange={(event) =>
                          setFailedDeliveryAction(event.target.value as FailedDeliveryAction)
                        }
                        disabled={actionLoading || isFulfillmentUpdateLocked}
                        className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
                      >
                        {FAILED_DELIVERY_ACTIONS.map((action) => (
                          <option key={action} value={action}>
                            {action}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block text-xs font-medium text-stone-700">
                      Ghi chú xử lý
                      <textarea
                        value={failedDeliveryActionNote}
                        onChange={(event) => setFailedDeliveryActionNote(event.target.value)}
                        disabled={actionLoading || isFulfillmentUpdateLocked}
                        rows={2}
                        className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
                      />
                    </label>
                    <button
                      type="button"
                      disabled={actionLoading || isFulfillmentUpdateLocked}
                      onClick={() => void handleFailedDeliveryResolution()}
                      className="w-full rounded-md bg-stone-900 px-3 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-50"
                    >
                      {actionLoading ? "Đang xử lý..." : "Thực hiện hành động failed delivery"}
                    </button>
                  </div>
                ) : null}

                <div className="max-h-64 space-y-2 overflow-y-auto border-t border-stone-200 pt-3">
                  {orderDetail.items.map((item) => (
                    <div
                      key={`${item.product_id}-${item.product_name}`}
                      className="rounded-lg border border-stone-200 bg-white p-2"
                    >
                      <p className="text-xs font-semibold text-stone-900">{item.product_name}</p>
                      <p className="text-xs text-stone-600">
                        {formatVnd(item.price)} x {item.quantity} = {formatVnd(item.subtotal)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
