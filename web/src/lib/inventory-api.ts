import { adminFetchEnvelope, adminFetchPaginated, type AdminAuthorizedRequest } from "@/lib/admin-api";

export type InventoryChannel = "internal" | "shopee" | "tiktok";
export type InventoryMovementType = "IN" | "OUT" | "RESERVE" | "RELEASE";

/** Hàng từ `GET /inventory` (raw query API trả snake_case). */
export type AdminInventoryRow = {
  product_id: string;
  product_name: string;
  channel: InventoryChannel;
  available_stock: number;
  reserved_stock: number;
  updated_at: string;
};

export type AdminInventoryMovement = {
  id: string;
  productId: string;
  channel: InventoryChannel;
  type: InventoryMovementType;
  quantity: number;
  beforeStock: number;
  afterStock: number;
  reason: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

export type AdminProductInventoryResponse = {
  product_id: string;
  channels: Array<{
    channel: InventoryChannel;
    available_stock: number;
    reserved_stock: number;
  }>;
};

export type ListAdminInventoryQuery = {
  page?: number;
  limit?: number;
  product_id?: string;
  channel?: InventoryChannel;
  low_stock?: boolean;
};

export type ListAdminInventoryMovementsQuery = {
  page?: number;
  limit?: number;
  product_id?: string;
  channel?: InventoryChannel;
  type?: InventoryMovementType;
  from_date?: string;
  to_date?: string;
};

export type AdjustAdminInventoryPayload = {
  channel: InventoryChannel;
  type: "IN" | "OUT";
  quantity: number;
  reason: string;
};

export type SyncAdminInventoryPayload = {
  product_id: string;
  channel: "shopee" | "tiktok";
};

function inventoryListQueryString(params: ListAdminInventoryQuery = {}) {
  const query = new URLSearchParams();
  if (params.page !== undefined) query.set("page", String(params.page));
  if (params.limit !== undefined) query.set("limit", String(params.limit));
  if (params.product_id) query.set("product_id", params.product_id);
  if (params.channel) query.set("channel", params.channel);
  if (params.low_stock === true) query.set("low_stock", "true");
  const qs = query.toString();
  return qs.length > 0 ? `?${qs}` : "";
}

function inventoryMovementsQueryString(params: ListAdminInventoryMovementsQuery = {}) {
  const query = new URLSearchParams();
  if (params.page !== undefined) query.set("page", String(params.page));
  if (params.limit !== undefined) query.set("limit", String(params.limit));
  if (params.product_id) query.set("product_id", params.product_id);
  if (params.channel) query.set("channel", params.channel);
  if (params.type) query.set("type", params.type);
  if (params.from_date) query.set("from_date", params.from_date);
  if (params.to_date) query.set("to_date", params.to_date);
  const qs = query.toString();
  return qs.length > 0 ? `?${qs}` : "";
}

export async function listAdminInventory(params: ListAdminInventoryQuery = {}) {
  return adminFetchPaginated<AdminInventoryRow[]>(
    `/inventory${inventoryListQueryString(params)}`,
  );
}

export async function getAdminProductInventory(productId: string) {
  const response = await adminFetchEnvelope<AdminProductInventoryResponse>(`/inventory/${productId}`);
  if (!response.data) {
    throw new Error("Unexpected API response format");
  }
  return response.data;
}

export async function listAdminInventoryMovements(params: ListAdminInventoryMovementsQuery = {}) {
  return adminFetchPaginated<AdminInventoryMovement[]>(
    `/inventory/movements${inventoryMovementsQueryString(params)}`,
  );
}

export async function adjustAdminInventory(productId: string, payload: AdjustAdminInventoryPayload) {
  const request: AdminAuthorizedRequest = {
    method: "PATCH",
    body: JSON.stringify({
      channel: payload.channel,
      type: payload.type,
      quantity: payload.quantity,
      reason: payload.reason,
    }),
  };
  const response = await adminFetchEnvelope<unknown>(`/inventory/${productId}/adjust`, request);
  return response.message ?? "Inventory adjusted successfully";
}

export async function syncAdminInventory(payload: SyncAdminInventoryPayload) {
  const request: AdminAuthorizedRequest = {
    method: "POST",
    body: JSON.stringify({
      product_id: payload.product_id,
      channel: payload.channel,
    }),
  };
  const response = await adminFetchEnvelope<unknown>("/inventory/sync", request);
  return response.message ?? "Inventory synced successfully";
}
