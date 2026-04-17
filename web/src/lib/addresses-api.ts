import { getApiErrorMessage } from "@/lib/api-error";
import { refreshToken } from "@/lib/auth-api";
import { getStoredTokens, setStoredTokens } from "@/lib/auth-storage";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

type ApiEnvelope<T> = {
  success: boolean;
  data?: T;
  message?: string;
};

type AuthorizedRequest = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: string;
};

export type AddressItem = {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  address_line: string;
  ward: string;
  district: string;
  city: string;
  country: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
};

export type CreateAddressPayload = {
  full_name: string;
  phone: string;
  address_line: string;
  ward: string;
  district?: string;
  city: string;
  country: string;
  is_default?: boolean;
};

export type UpdateAddressPayload = Partial<CreateAddressPayload>;

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

  const jsonUnknown = (await response.json()) as unknown;
  if (!response.ok) {
    throw new Error(getApiErrorMessage(jsonUnknown, "Address request failed"));
  }
  return jsonUnknown as ApiEnvelope<T>;
}

async function withRefresh<T>(path: string, request: AuthorizedRequest = {}) {
  const tokens = getStoredTokens();
  if (!tokens?.access_token) {
    throw new Error("Bạn chưa đăng nhập.");
  }

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

export async function listMyAddresses(userId?: string): Promise<AddressItem[]> {
  const params = new URLSearchParams();
  if (userId) {
    params.set("user_id", userId);
  }
  const queryString = params.toString();
  const envelope = await withRefresh<AddressItem[]>(
    `/addresses${queryString ? `?${queryString}` : ""}`,
  );
  if (!envelope.data) {
    throw new Error("Unexpected API response format");
  }
  return envelope.data;
}

export async function getMyAddressById(id: string): Promise<AddressItem> {
  const envelope = await withRefresh<AddressItem>(`/addresses/${id}`);
  if (!envelope.data) {
    throw new Error("Unexpected API response format");
  }
  return envelope.data;
}

export async function createMyAddress(payload: CreateAddressPayload): Promise<AddressItem> {
  const envelope = await withRefresh<AddressItem>("/addresses", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!envelope.data) {
    throw new Error("Unexpected API response format");
  }
  return envelope.data;
}

export async function updateMyAddress(
  id: string,
  payload: UpdateAddressPayload,
): Promise<string> {
  const envelope = await withRefresh<unknown>(`/addresses/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return envelope.message ?? "Address updated successfully";
}

export async function deleteMyAddress(id: string): Promise<string> {
  const envelope = await withRefresh<unknown>(`/addresses/${id}`, {
    method: "DELETE",
  });
  return envelope.message ?? "Address deleted successfully";
}

export async function setDefaultMyAddress(id: string): Promise<string> {
  const envelope = await withRefresh<unknown>(`/addresses/${id}/set-default`, {
    method: "PATCH",
  });
  return envelope.message ?? "Address set as default successfully";
}
