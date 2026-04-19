import { refreshToken } from "@/lib/auth-api";
import { getStoredTokens, setStoredTokens } from "@/lib/auth-storage";
import { getApiErrorMessage } from "@/lib/api-error";

export type ApiEnvelope<T> = {
  success: boolean;
  data?: T;
  message?: string;
};

export type AdminPagination = {
  page: number;
  limit: number;
  total: number;
};

type ApiPaginatedEnvelope<T> = {
  success: boolean;
  data?: T;
  pagination?: AdminPagination;
  message?: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export type AdminUser = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  role: UserRole;
  permissions: PermissionCode[];
};

export type UserRole = "ADMIN" | "STAFF" | "USER";
export type PermissionCode =
  | "PRODUCT_MANAGE"
  | "ORDER_MANAGE"
  | "USER_READ"
  | "CATEGORY_READ"
  | "CATEGORY_MANAGE"
  | "INVENTORY_READ"
  | "INVENTORY_MANAGE"
  | "CMS_READ"
  | "CMS_EDIT"
  | "PROMOTION_READ"
  | "PROMOTION_MANAGE"
  | "REVIEW_READ"
  | "REVIEW_MODERATE"
  | "AUDIT_READ";

export type ListUsersQuery = {
  page?: number;
  limit?: number;
};

export type UpdateAdminUserPayload = {
  first_name?: string;
  last_name?: string;
  phone?: string;
};

export type UpdateAdminUserRolePayload = {
  role: UserRole;
  permissions?: PermissionCode[];
};

export type AdminAuthorizedRequest = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: string | FormData;
};

async function requestWithToken<T>(
  path: string,
  accessToken: string,
  request: AdminAuthorizedRequest = {},
): Promise<ApiEnvelope<T>> {
  const isFormData = request.body instanceof FormData;
  const response = await fetch(`${API_URL}${path}`, {
    method: request.method ?? "GET",
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      Authorization: `Bearer ${accessToken}`,
    },
    body: request.body,
    cache: "no-store",
  });

  const json = (await response.json()) as ApiEnvelope<T> | { message?: string };
  if (!response.ok) {
    const message = getApiErrorMessage(json, "Admin request failed");
    throw new Error(message);
  }

  return json as ApiEnvelope<T>;
}

async function getAccessTokenForRequest() {
  const tokens = getStoredTokens();
  if (!tokens?.access_token) {
    throw new Error("Bạn chưa đăng nhập.");
  }
  return tokens;
}

async function requestWithTokenPaginated<T>(
  path: string,
  accessToken: string,
  request: AdminAuthorizedRequest = {},
): Promise<{ data: T; pagination: AdminPagination }> {
  const isFormData = request.body instanceof FormData;
  const response = await fetch(`${API_URL}${path}`, {
    method: request.method ?? "GET",
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      Authorization: `Bearer ${accessToken}`,
    },
    body: request.body,
    cache: "no-store",
  });

  const jsonUnknown = await response.json();
  if (!response.ok) {
    const message = getApiErrorMessage(jsonUnknown, "Admin request failed");
    throw new Error(message);
  }
  const json = jsonUnknown as ApiPaginatedEnvelope<T>;
  if (!json.success || json.data === undefined || json.pagination === undefined) {
    throw new Error("Unexpected API response format");
  }
  return { data: json.data, pagination: json.pagination };
}

async function withRefresh<T>(path: string, request: AdminAuthorizedRequest = {}): Promise<ApiEnvelope<T>> {
  const tokens = await getAccessTokenForRequest();

  try {
    return await requestWithToken<T>(path, tokens.access_token, request);
  } catch (error) {
    if (!(error instanceof Error) || !/unauthorized|forbidden|jwt/i.test(error.message)) {
      throw error;
    }

    if (!tokens.refresh_token) {
      throw error;
    }

    const refreshed = await refreshToken(tokens.refresh_token);
    setStoredTokens(refreshed);
    return requestWithToken<T>(path, refreshed.access_token, request);
  }
}

async function withRefreshPaginated<T>(
  path: string,
  request: AdminAuthorizedRequest = {},
): Promise<{ data: T; pagination: AdminPagination }> {
  const tokens = await getAccessTokenForRequest();

  try {
    return await requestWithTokenPaginated<T>(path, tokens.access_token, request);
  } catch (error) {
    if (!(error instanceof Error) || !/unauthorized|forbidden|jwt/i.test(error.message)) {
      throw error;
    }

    if (!tokens.refresh_token) {
      throw error;
    }

    const refreshed = await refreshToken(tokens.refresh_token);
    setStoredTokens(refreshed);
    return requestWithTokenPaginated<T>(path, refreshed.access_token, request);
  }
}

/** Dùng cho module API theo domain (ví dụ `inventory-api.ts`): gọi endpoint trả `{ data, pagination }`. */
export async function adminFetchPaginated<T>(
  path: string,
  request: AdminAuthorizedRequest = {},
): Promise<{ data: T; pagination: AdminPagination }> {
  return withRefreshPaginated<T>(path, request);
}

/** Gọi endpoint admin, trả envelope đầy đủ (data/message). */
export async function adminFetchEnvelope<T>(
  path: string,
  request: AdminAuthorizedRequest = {},
): Promise<ApiEnvelope<T>> {
  return withRefresh<T>(path, request);
}

function toQueryString(params: ListUsersQuery = {}) {
  const query = new URLSearchParams();
  if (params.page !== undefined) {
    query.set("page", String(params.page));
  }
  if (params.limit !== undefined) {
    query.set("limit", String(params.limit));
  }
  const queryString = query.toString();
  return queryString.length > 0 ? `?${queryString}` : "";
}

export async function getAdminUsers(params: ListUsersQuery = {}) {
  const response = await withRefresh<AdminUser[]>(`/users${toQueryString(params)}`);
  if (!response.data) {
    throw new Error("Unexpected API response format");
  }
  return response.data;
}

export async function getAdminUserById(id: string) {
  const response = await withRefresh<AdminUser>(`/users/${id}`);
  if (!response.data) {
    throw new Error("Unexpected API response format");
  }
  return response.data;
}

export async function updateAdminUser(id: string, payload: UpdateAdminUserPayload) {
  const response = await withRefresh<unknown>(`/users/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return response.message ?? "User updated successfully";
}

export async function deleteAdminUser(id: string) {
  const response = await withRefresh<unknown>(`/users/${id}`, {
    method: "DELETE",
  });
  return response.message ?? "User deleted successfully";
}

export async function updateAdminUserRole(id: string, payload: UpdateAdminUserRolePayload) {
  const response = await withRefresh<unknown>(`/users/${id}/role`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return response.message ?? "Role updated successfully";
}

export type AdminProduct = {
  id: string;
  name: string;
  slug: string;
  price: number;
  thumbnail: string;
  category: {
    id: string;
    name: string;
  };
  is_active: boolean;
  created_at: string;
};

export type AdminProductDetail = {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  category: {
    id: string;
    name: string;
    parent: { id: string; name: string } | null;
  };
  images: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ListAdminProductsQuery = {
  page?: number;
  limit?: number;
  keyword?: string;
  category_id?: string;
  sort?: "newest" | "price_asc" | "price_desc";
  is_active?: boolean;
};

export async function getAdminProducts(params: ListAdminProductsQuery = {}) {
  const query = new URLSearchParams();
  if (params.page !== undefined) query.set("page", String(params.page));
  if (params.limit !== undefined) query.set("limit", String(params.limit));
  if (params.keyword) query.set("keyword", params.keyword);
  if (params.category_id) query.set("category_id", params.category_id);
  if (params.sort) query.set("sort", params.sort);
  if (params.is_active !== undefined) query.set("is_active", String(params.is_active));
  const qs = query.toString();

  const response = await withRefresh<AdminProduct[]>(`/products${qs.length > 0 ? `?${qs}` : ""}`);
  if (!response.data) {
    throw new Error("Unexpected API response format");
  }
  return response.data;
}

export type CreateAdminProductPayload = {
  name: string;
  description: string;
  price: number;
  category_id: string;
  images?: string[];
  image_files?: File[];
};

export type UpdateAdminProductPayload = {
  name?: string;
  description?: string;
  price?: number;
  is_active?: boolean;
  main_image_index?: number;
  images?: string[];
  image_files?: File[];
};

export async function getAdminProductById(id: string) {
  const response = await withRefresh<AdminProductDetail>(`/products/${id}`);
  if (!response.data) {
    throw new Error("Unexpected API response format");
  }
  return response.data;
}

export async function createAdminProduct(payload: CreateAdminProductPayload) {
  const body = new FormData();
  body.append("name", payload.name);
  body.append("description", payload.description);
  body.append("price", String(payload.price));
  body.append("category_id", payload.category_id);
  for (const image of payload.images ?? []) {
    body.append("images", image);
  }
  for (const file of payload.image_files ?? []) {
    body.append("image_files", file);
  }

  const response = await withRefresh<unknown>("/products", {
    method: "POST",
    body,
  });
  return response.message ?? "Product created successfully";
}

export async function patchAdminProduct(id: string, payload: UpdateAdminProductPayload) {
  const body = new FormData();
  if (payload.name !== undefined) body.append("name", payload.name);
  if (payload.description !== undefined) body.append("description", payload.description);
  if (payload.price !== undefined) body.append("price", String(payload.price));
  if (payload.is_active !== undefined) body.append("is_active", String(payload.is_active));
  if (payload.main_image_index !== undefined) body.append("main_image_index", String(payload.main_image_index));
  for (const image of payload.images ?? []) {
    body.append("images", image);
  }
  for (const file of payload.image_files ?? []) {
    body.append("image_files", file);
  }

  const response = await withRefresh<unknown>(`/products/${id}`, {
    method: "PATCH",
    body,
  });
  return response.message ?? "Product updated successfully";
}

export async function deleteAdminProduct(id: string) {
  const response = await withRefresh<unknown>(`/products/${id}`, {
    method: "DELETE",
  });
  return response.message ?? "Product deleted successfully";
}

export type AdminCategory = {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  level: 1 | 2;
  image_url: string;
  is_active: boolean;
};

export type CreateCategoryPayload = {
  name: string;
  description?: string;
  parent_id?: string | null;
  image_url?: string;
};

export type UpdateCategoryPayload = {
  name?: string;
  description?: string;
  image_url?: string;
  is_active?: boolean;
};

export async function createAdminCategory(payload: CreateCategoryPayload) {
  const response = await withRefresh<unknown>("/categories", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return response.message ?? "Category created successfully";
}

export async function patchAdminCategory(id: string, payload: UpdateCategoryPayload) {
  const response = await withRefresh<unknown>(`/categories/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return response.message ?? "Category updated successfully";
}

export async function deleteAdminCategory(id: string) {
  const response = await withRefresh<unknown>(`/categories/${id}`, {
    method: "DELETE",
  });
  return response.message ?? "Category deleted successfully";
}

export type AdminReviewRow = {
  id: string;
  product_id: string;
  user_id: string;
  order_id: string;
  rating: number;
  content: string;
  media_urls: string[];
  status: string;
  is_verified_purchase: boolean;
  helpful_count: number;
  created_at: string;
  updated_at: string;
};

export type ListAdminReviewsQuery = {
  page?: number;
  limit?: number;
  status?: "PENDING" | "APPROVED" | "REJECTED" | "HIDDEN";
  product_id?: string;
};

function toAdminReviewsQueryString(query: ListAdminReviewsQuery = {}) {
  const params = new URLSearchParams();
  if (query.page !== undefined) params.set("page", String(query.page));
  if (query.limit !== undefined) params.set("limit", String(query.limit));
  if (query.status) params.set("status", query.status);
  if (query.product_id) params.set("product_id", query.product_id);
  const qs = params.toString();
  return qs.length > 0 ? `?${qs}` : "";
}

export async function listAdminReviews(query: ListAdminReviewsQuery = {}) {
  return adminFetchPaginated<AdminReviewRow[]>(
    `/admin/reviews${toAdminReviewsQueryString(query)}`,
  );
}

export async function moderateAdminReview(
  reviewId: string,
  status: ListAdminReviewsQuery["status"],
): Promise<AdminReviewRow> {
  const response = await withRefresh<AdminReviewRow>(`/admin/reviews/${reviewId}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
  if (!response.success || !response.data) {
    throw new Error(response.message ?? "Không cập nhật được trạng thái đánh giá.");
  }
  return response.data;
}

export type AdminAuditLogRow = {
  id: string;
  actor_id: string | null;
  actor_role: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export type AdminAuditLogDetail = AdminAuditLogRow & {
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
};

export type ListAdminAuditLogsQuery = {
  page?: number;
  limit?: number;
  actor_id?: string;
  action?: string;
  entity_type?: string;
  entity_id?: string;
  date_from?: string;
  date_to?: string;
};

function toAdminAuditLogsQueryString(query: ListAdminAuditLogsQuery = {}) {
  const params = new URLSearchParams();
  if (query.page !== undefined) params.set("page", String(query.page));
  if (query.limit !== undefined) params.set("limit", String(query.limit));
  if (query.actor_id) params.set("actor_id", query.actor_id);
  if (query.action) params.set("action", query.action);
  if (query.entity_type) params.set("entity_type", query.entity_type);
  if (query.entity_id) params.set("entity_id", query.entity_id);
  if (query.date_from) params.set("date_from", query.date_from);
  if (query.date_to) params.set("date_to", query.date_to);
  const qs = params.toString();
  return qs.length > 0 ? `?${qs}` : "";
}

export async function listAdminAuditLogs(query: ListAdminAuditLogsQuery = {}) {
  return adminFetchPaginated<AdminAuditLogRow[]>(
    `/admin/audit-logs${toAdminAuditLogsQueryString(query)}`,
  );
}

export async function getAdminAuditLogDetail(id: string): Promise<AdminAuditLogDetail> {
  const response = await withRefresh<AdminAuditLogDetail>(`/admin/audit-logs/${id}`);
  if (!response.success || !response.data) {
    throw new Error(response.message ?? "Không tải được chi tiết nhật ký.");
  }
  return response.data;
}
