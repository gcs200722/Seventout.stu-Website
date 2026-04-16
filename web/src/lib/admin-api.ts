import { refreshToken } from "@/lib/auth-api";
import { getStoredTokens, setStoredAccessToken } from "@/lib/auth-storage";
import { getApiErrorMessage } from "@/lib/api-error";

type ApiEnvelope<T> = {
  success: boolean;
  data?: T;
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
  | "CATEGORY_MANAGER";

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

type AuthorizedRequest = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: string;
};

async function requestWithToken<T>(
  path: string,
  accessToken: string,
  request: AuthorizedRequest = {},
): Promise<ApiEnvelope<T>> {
  const response = await fetch(`${API_URL}${path}`, {
    method: request.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
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

async function withRefresh<T>(path: string, request: AuthorizedRequest = {}): Promise<ApiEnvelope<T>> {
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
    setStoredAccessToken(refreshed.access_token);
    return requestWithToken<T>(path, refreshed.access_token, request);
  }
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

export async function getAdminOrdersMessage() {
  const response = await withRefresh<unknown>("/orders");
  return response.message ?? "Order endpoint authorized";
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
