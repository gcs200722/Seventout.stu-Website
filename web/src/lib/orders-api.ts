import { withAuth } from "@/lib/http-client";

export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PROCESSING"
  | "SHIPPED"
  | "COMPLETED"
  | "CANCELED";

export type PaymentStatus = "UNPAID" | "PAID" | "FAILED" | "REFUNDED";

export type OrderListItem = {
  id: string;
  userId: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod?: "COD" | "VNPAY" | "STRIPE" | null;
  totalAmount: number;
  shippingAddress: {
    full_name: string;
    phone: string;
    address_line: string;
    ward: string;
    district?: string;
    city: string;
    country: string;
  };
  note: string;
  createdAt: string;
  updatedAt: string;
};

export type OrderDiscountLineItem = {
  product_id: string;
  product_name?: string;
  subtotal?: number;
  discount_amount: number;
  attribution?: "auto" | "coupon";
};

export type OrderPricingSnapshot = Record<string, unknown> & {
  subtotal_amount?: number;
  discount_total?: number;
  total_amount?: number;
  stack_mode?: string;
  coupon?: { id?: string; code?: string; discount_amount?: number };
  auto_promotion?: { campaign_id?: string; campaign_name?: string; discount_amount?: number };
  discount_line_items?: OrderDiscountLineItem[];
};

export type OrderDetail = {
  id: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  payment_method?: "COD" | "VNPAY" | "STRIPE" | null;
  total_amount: number;
  discount_total?: number;
  pricing_snapshot?: OrderPricingSnapshot;
  shipping_address: {
    full_name: string;
    phone: string;
    address_line: string;
    ward: string;
    district?: string;
    city: string;
    country: string;
  };
  items: Array<{
    product_id: string;
    product_name: string;
    price: number;
    quantity: number;
    subtotal: number;
  }>;
  created_at: string;
};

export type CreateOrderPayload = {
  cart_id: string;
  address_id: string;
  note?: string;
};

export type ListOrdersQuery = {
  page?: number;
  limit?: number;
  status?: OrderStatus;
  payment_status?: PaymentStatus;
};

function toQueryString(params: ListOrdersQuery = {}) {
  const query = new URLSearchParams();
  if (params.page !== undefined) query.set("page", String(params.page));
  if (params.limit !== undefined) query.set("limit", String(params.limit));
  if (params.status) query.set("status", params.status);
  if (params.payment_status) query.set("payment_status", params.payment_status);
  const qs = query.toString();
  return qs.length > 0 ? `?${qs}` : "";
}

export async function createMyOrder(payload: CreateOrderPayload, idempotencyKey?: string) {
  const envelope = await withAuth<{
    order_id: string;
    status: OrderStatus;
    payment_status: PaymentStatus;
    total_amount: number;
    idempotency_key: string;
  }>("/orders", {
    method: "POST",
    headers: idempotencyKey ? { "x-idempotency-key": idempotencyKey } : {},
    body: JSON.stringify(payload),
  });
  if (!envelope.data) {
    throw new Error("Unexpected API response format");
  }
  return envelope.data;
}

export async function listMyOrders(params: ListOrdersQuery = {}) {
  const envelope = await withAuth<OrderListItem[]>(`/orders${toQueryString(params)}`);
  if (!envelope.data || !envelope.pagination) {
    throw new Error("Unexpected API response format");
  }
  return {
    items: envelope.data,
    pagination: envelope.pagination,
  };
}

export async function getMyOrderDetail(orderId: string) {
  const envelope = await withAuth<OrderDetail>(`/orders/${orderId}`);
  if (!envelope.data) {
    throw new Error("Unexpected API response format");
  }
  return envelope.data;
}

export async function cancelMyOrder(orderId: string) {
  const envelope = await withAuth<unknown>(`/orders/${orderId}/cancel`, {
    method: "PATCH",
  });
  return envelope.message ?? "Order canceled successfully";
}
