"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";

import FulfillmentSummaryCard from "@/components/orders/FulfillmentSummaryCard";
import RefundSummaryCard from "@/components/orders/RefundSummaryCard";
import ReturnRequestCard from "@/components/orders/ReturnRequestCard";
import { DiscountLineItemsBreakdown } from "@/components/promotions/DiscountLineItemsBreakdown";
import { getFulfillmentByOrderId, type FulfillmentDetail } from "@/lib/fulfillment-api";
import { listRefunds } from "@/lib/refunds-api";
import { createReturn, listReturns } from "@/lib/returns-api";
import {
  cancelMyOrder,
  getMyOrderDetail,
  type OrderDiscountLineItem,
  type OrderPricingSnapshot,
} from "@/lib/orders-api";
import {
  buildProductHref,
  formatVnd,
  getProductsByIdsPublic,
} from "@/lib/products-api";

function canCancelOrder(status: string) {
  return status === "PENDING" || status === "CONFIRMED";
}

function discountLineItemsFromSnapshot(snapshot: OrderPricingSnapshot | undefined): OrderDiscountLineItem[] {
  const raw = snapshot?.discount_line_items;
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.filter(
    (row): row is OrderDiscountLineItem =>
      typeof row === "object" &&
      row !== null &&
      "product_id" in row &&
      typeof (row as { product_id: unknown }).product_id === "string" &&
      "discount_amount" in row &&
      typeof (row as { discount_amount: unknown }).discount_amount === "number",
  );
}

function promotionSummaryFromSnapshot(snapshot: OrderPricingSnapshot | undefined): string | null {
  if (!snapshot || typeof snapshot !== "object") {
    return null;
  }
  const parts: string[] = [];
  const coupon = snapshot.coupon;
  if (coupon && typeof coupon === "object" && "code" in coupon && typeof (coupon as { code?: unknown }).code === "string") {
    parts.push(`Coupon ${(coupon as { code: string }).code}`);
  }
  const auto = snapshot.auto_promotion;
  if (
    auto &&
    typeof auto === "object" &&
    "campaign_name" in auto &&
    typeof (auto as { campaign_name?: unknown }).campaign_name === "string"
  ) {
    parts.push(String((auto as { campaign_name: string }).campaign_name));
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderId = Array.isArray(params.id) ? params.id[0] : params.id;
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [order, setOrder] = useState<Awaited<ReturnType<typeof getMyOrderDetail>> | null>(null);
  const [fulfillment, setFulfillment] = useState<FulfillmentDetail | null>(null);
  const [fulfillmentLoading, setFulfillmentLoading] = useState(false);
  const [fulfillmentError, setFulfillmentError] = useState<string | null>(null);
  const [returnItem, setReturnItem] = useState<Awaited<ReturnType<typeof listReturns>>["items"][number] | null>(null);
  const [refundItem, setRefundItem] = useState<Awaited<ReturnType<typeof listRefunds>>["items"][number] | null>(null);
  const [returnReason, setReturnReason] = useState("");
  const [returnNote, setReturnNote] = useState("");
  const [productHrefById, setProductHrefById] = useState<Record<string, string>>({});

  useEffect(() => {
    async function loadOrder() {
      setLoading(true);
      setError(null);
      setFulfillmentLoading(true);
      setFulfillmentError(null);
      try {
        const [detail, fulfillmentDetail] = await Promise.all([
          getMyOrderDetail(orderId),
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
        setOrder(detail);
        setFulfillment(fulfillmentDetail);
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Không tải được chi tiết đơn hàng.");
      } finally {
        setLoading(false);
        setFulfillmentLoading(false);
      }
    }
    if (orderId) {
      void loadOrder();
      void loadReturnAndRefund(orderId);
    }
  }, [orderId]);

  useEffect(() => {
    async function loadProductHrefs() {
      if (!order || order.items.length === 0) {
        setProductHrefById({});
        return;
      }
      try {
        const details = await getProductsByIdsPublic(
          order.items.map((item) => item.product_id),
        );
        const map: Record<string, string> = {};
        for (const product of details) {
          map[product.id] = buildProductHref(product);
        }
        setProductHrefById(map);
      } catch {
        setProductHrefById({});
      }
    }
    void loadProductHrefs();
  }, [order]);

  async function reloadOrderAndFulfillment(currentOrderId: string) {
    setFulfillmentLoading(true);
    setFulfillmentError(null);
    try {
      const [refreshedOrder, refreshedFulfillment] = await Promise.all([
        getMyOrderDetail(currentOrderId),
        getFulfillmentByOrderId(currentOrderId).catch((requestError) => {
          if (
            requestError instanceof Error &&
            /fulfillment not found|not found|404/i.test(requestError.message)
          ) {
            return null;
          }
          throw requestError;
        }),
      ]);
      setOrder(refreshedOrder);
      setFulfillment(refreshedFulfillment);
    } catch (requestError) {
      setFulfillmentError(
        requestError instanceof Error
          ? requestError.message
          : "Không tải được trạng thái vận chuyển.",
      );
    } finally {
      setFulfillmentLoading(false);
    }
  }

  async function loadReturnAndRefund(currentOrderId: string) {
    const [returnsResponse, refundsResponse] = await Promise.all([
      listReturns({ page: 1, limit: 5 }).catch(() => ({ items: [], pagination: { page: 1, limit: 5, total: 0 } })),
      listRefunds({ page: 1, limit: 1, order_id: currentOrderId }).catch(() => ({
        items: [],
        pagination: { page: 1, limit: 1, total: 0 },
      })),
    ]);
    const matchedReturn = returnsResponse.items.find((item) => item.orderId === currentOrderId) ?? null;
    setReturnItem(matchedReturn);
    setRefundItem(refundsResponse.items[0] ?? null);
  }

  useEffect(() => {
    const paymentStatus = searchParams.get("payment_status");
    if (!paymentStatus) {
      return;
    }
    if (paymentStatus === "PENDING") {
      setSuccess("Thanh toán COD đã được khởi tạo, vui lòng chờ xác nhận.");
      return;
    }
    setSuccess(`Thanh toán hiện tại: ${paymentStatus}`);
  }, [searchParams]);

  async function handleCancelOrder() {
    if (!order || !canCancelOrder(order.status)) {
      return;
    }
    const confirmed = window.confirm("Bạn chắc chắn muốn hủy đơn hàng này?");
    if (!confirmed) {
      return;
    }
    setActionLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const message = await cancelMyOrder(order.id);
      setSuccess(message);
      await reloadOrderAndFulfillment(order.id);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể hủy đơn hàng.");
    } finally {
      setActionLoading(false);
    }
  }

  const orderPromotionSummary = order ? promotionSummaryFromSnapshot(order.pricing_snapshot) : null;
  const orderDiscountLines = order ? discountLineItemsFromSnapshot(order.pricing_snapshot) : [];
  const hasOrderDiscountBreakdown =
    orderDiscountLines.length > 0 && (order?.discount_total ?? 0) > 0;
  const firstReviewHref =
    order && order.status === "COMPLETED" && order.items.length > 0
      ? `${productHrefById[order.items[0].product_id] ?? "/products"}?order_id=${encodeURIComponent(order.id)}`
      : null;

  async function handleCreateReturn() {
    if (!order || returnReason.trim().length === 0) return;
    setActionLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await createReturn({
        order_id: order.id,
        reason: returnReason.trim(),
        note: returnNote.trim() || undefined,
      });
      setReturnReason("");
      setReturnNote("");
      setSuccess("Đã tạo yêu cầu trả hàng.");
      await loadReturnAndRefund(order.id);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể tạo yêu cầu trả hàng.");
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-semibold text-stone-900">Chi tiết đơn hàng</h1>
          <button
            type="button"
            onClick={() => router.push("/orders")}
            className="rounded-full border border-stone-300 px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-100"
          >
            Về danh sách đơn
          </button>
        </div>

        {loading ? <p className="mt-4 text-sm text-stone-500">Đang tải dữ liệu đơn hàng...</p> : null}
        {error ? (
          <p className="mt-4 whitespace-pre-line rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            {error}
          </p>
        ) : null}
        {success ? (
          <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
            {success}
          </p>
        ) : null}
        {fulfillmentError ? (
          <p className="mt-4 whitespace-pre-line rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
            {fulfillmentError}
          </p>
        ) : null}

        {!loading && order ? (
          <div className="mt-5 space-y-4">
            <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700">
              <p>
                <span className="font-semibold text-stone-900">Mã đơn:</span> {order.id}
              </p>
              <p className="mt-1">
                <span className="font-semibold text-stone-900">Trạng thái:</span> {order.status}
              </p>
              <p className="mt-1">
                <span className="font-semibold text-stone-900">Thanh toán:</span> {order.payment_status}
              </p>
              <p className="mt-1">
                <span className="font-semibold text-stone-900">Tổng tiền:</span> {formatVnd(order.total_amount)}
              </p>
              {(order.discount_total ?? 0) > 0 ? (
                hasOrderDiscountBreakdown ? (
                  <div className="mt-2 space-y-2">
                    <DiscountLineItemsBreakdown
                      items={orderDiscountLines}
                      className="rounded-md border border-stone-200 bg-white p-3"
                    />
                    <p className="text-sm">
                      <span className="font-semibold text-stone-900">Tổng giảm giá:</span>{" "}
                      <span className="text-emerald-700">−{formatVnd(order.discount_total ?? 0)}</span>
                    </p>
                  </div>
                ) : (
                  <p className="mt-1">
                    <span className="font-semibold text-stone-900">Giảm giá:</span>{" "}
                    <span className="text-emerald-700">−{formatVnd(order.discount_total ?? 0)}</span>
                  </p>
                )
              ) : null}
              {orderPromotionSummary ? (
                <p className="mt-1 text-xs text-stone-600">
                  <span className="font-semibold text-stone-800">Khuyến mãi:</span> {orderPromotionSummary}
                </p>
              ) : null}
              <p className="mt-1">
                <span className="font-semibold text-stone-900">Người nhận:</span> {order.shipping_address.full_name} (
                {order.shipping_address.phone})
              </p>
              <p className="mt-1">
                <span className="font-semibold text-stone-900">Địa chỉ:</span>{" "}
                {order.shipping_address.address_line}, {order.shipping_address.ward}, {order.shipping_address.city},{" "}
                {order.shipping_address.country}
              </p>
              <p className="mt-1">
                <span className="font-semibold text-stone-900">Thời gian tạo:</span>{" "}
                {new Date(order.created_at).toLocaleString("vi-VN")}
              </p>
              {canCancelOrder(order.status) ? (
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => void handleCancelOrder()}
                  className="mt-3 rounded-full border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                >
                  {actionLoading ? "Đang xử lý..." : "Hủy đơn hàng"}
                </button>
              ) : null}
            </div>

            <FulfillmentSummaryCard fulfillment={fulfillment} loading={fulfillmentLoading} />
            <div className="space-y-3 rounded-xl border border-stone-200 bg-white p-4">
              <h2 className="text-base font-semibold text-stone-900">Return & Refund</h2>
              <ReturnRequestCard item={returnItem} />
              <RefundSummaryCard item={refundItem} />
              {order.status === "COMPLETED" && !returnItem ? (
                <div className="space-y-2 rounded-xl border border-stone-200 text-stone-900 bg-stone-50 p-3">
                  <p className="text-xs font-semibold text-stone-900">Tạo yêu cầu trả hàng</p>
                  <input
                    value={returnReason}
                    onChange={(event) => setReturnReason(event.target.value)}
                    placeholder="Lý do trả hàng"
                    className="w-full rounded-md border border-stone-300 text-stone-900 px-3 py-2 text-sm"
                  />
                  <textarea
                    value={returnNote}
                    onChange={(event) => setReturnNote(event.target.value)}
                    rows={2}
                    placeholder="Ghi chú"
                    className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => void handleCreateReturn()}
                    disabled={actionLoading || returnReason.trim().length === 0}
                    className="w-full rounded-md bg-stone-900 px-3 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-50"
                  >
                    {actionLoading ? "Đang gửi..." : "Tạo yêu cầu trả hàng"}
                  </button>
                </div>
              ) : null}
            </div>

            <div className="space-y-3">
              <h2 className="text-base font-semibold text-stone-900">Sản phẩm trong đơn</h2>
              {order.status === "COMPLETED" ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-sm font-semibold text-emerald-900">
                    Giao hàng thành công. Bạn vui lòng đánh giá trải nghiệm sản phẩm để giúp cộng đồng mua sắm tốt hơn.
                  </p>
                  {firstReviewHref ? (
                    <Link
                      href={firstReviewHref}
                      className="mt-3 inline-flex rounded-full border border-emerald-700 bg-white px-4 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
                    >
                      Đánh giá sản phẩm ngay
                    </Link>
                  ) : null}
                </div>
              ) : null}
              {order.items.map((item) => (
                <article
                  key={`${item.product_variant_id}-${item.product_name}`}
                  className="rounded-xl border border-stone-200 bg-white p-4"
                >
                  <p className="text-sm font-semibold text-stone-900">{item.product_name}</p>
                  <p className="mt-1 text-xs text-stone-600">
                    {item.variant_color} · {item.variant_size}
                  </p>
                  <p className="mt-1 text-xs text-stone-600">Mã SP: {item.product_id}</p>
                  <p className="mt-1 text-xs text-stone-500">Biến thể: {item.product_variant_id}</p>
                  <p className="mt-1 text-xs text-stone-600">
                    {formatVnd(item.price)} x {item.quantity}
                  </p>
                  <p className="mt-1 text-sm font-medium text-stone-900">
                    Tạm tính: {formatVnd(item.subtotal)}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {order.status === "COMPLETED" ? (
                      <Link
                        href={`${productHrefById[item.product_id] ?? "/products"}?order_id=${encodeURIComponent(order.id)}`}
                        className="inline-flex rounded-full border border-stone-900 bg-stone-900 px-4 py-2 text-xs font-semibold text-white hover:bg-stone-700"
                      >
                        Đánh giá sản phẩm
                      </Link>
                    ) : null}
                    <Link
                      href={productHrefById[item.product_id] ?? `/products?keyword=${encodeURIComponent(item.product_name)}&page=1`}
                      className="inline-flex rounded-full border border-stone-900 bg-white px-4 py-2 text-xs font-semibold text-stone-900 hover:bg-stone-900 hover:text-white"
                    >
                      Tìm lại sản phẩm
                    </Link>
                  </div>
                </article>
              ))}
            </div>
            <Link
              href="/products"
              className="inline-flex rounded-full border border-stone-300 px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-100"
            >
              Tiếp tục mua sắm
            </Link>
          </div>
        ) : null}
      </section>
    </div>
  );
}
