import {
  adminFetchEnvelope,
  adminFetchPaginated,
  type AdminAuthorizedRequest,
} from "@/lib/admin-api";
import type { OrderStatus, PaymentStatus } from "@/lib/orders-api";

export type AdminOrderListItem = {
  id: string;
  userId: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  totalAmount: number;
  shippingAddress: {
    full_name: string;
    phone: string;
    address_line: string;
    ward: string;
    city: string;
    country: string;
  };
  note: string;
  createdAt: string;
  updatedAt: string;
};

export type AdminOrderDetail = {
  id: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  total_amount: number;
  shipping_address: {
    full_name: string;
    phone: string;
    address_line: string;
    ward: string;
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

export type ListAdminOrdersQuery = {
  page?: number;
  limit?: number;
  status?: OrderStatus;
  payment_status?: PaymentStatus;
};

export type ManageableOrderStatus =
  | "CONFIRMED"
  | "PROCESSING"
  | "SHIPPED"
  | "COMPLETED";

function toQueryString(params: ListAdminOrdersQuery = {}) {
  const query = new URLSearchParams();
  if (params.page !== undefined) query.set("page", String(params.page));
  if (params.limit !== undefined) query.set("limit", String(params.limit));
  if (params.status) query.set("status", params.status);
  if (params.payment_status) query.set("payment_status", params.payment_status);
  const qs = query.toString();
  return qs.length > 0 ? `?${qs}` : "";
}

export async function listAdminOrders(params: ListAdminOrdersQuery = {}) {
  return adminFetchPaginated<AdminOrderListItem[]>(`/orders${toQueryString(params)}`);
}

export async function getAdminOrderDetail(orderId: string) {
  const response = await adminFetchEnvelope<AdminOrderDetail>(`/orders/${orderId}`);
  if (!response.data) {
    throw new Error("Unexpected API response format");
  }
  return response.data;
}

export async function updateAdminOrderStatus(
  orderId: string,
  status: ManageableOrderStatus,
) {
  const request: AdminAuthorizedRequest = {
    method: "PATCH",
    body: JSON.stringify({ status }),
  };
  const response = await adminFetchEnvelope<unknown>(
    `/orders/${orderId}/status`,
    request,
  );
  return response.message ?? "Order status updated successfully";
}
