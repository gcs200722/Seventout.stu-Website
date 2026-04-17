import { refreshToken } from "@/lib/auth-api";
import { getApiErrorMessage } from "@/lib/api-error";
import { getStoredTokens, setStoredTokens } from "@/lib/auth-storage";

type ApiEnvelope<T> = {
  success: boolean;
  data?: T;
  message?: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export type UpdateProfilePayload = {
  first_name?: string;
  last_name?: string;
  phone?: string;
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
    const message = getApiErrorMessage(json, "Request failed");
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
    setStoredTokens(refreshed);
    return requestWithToken<T>(path, refreshed.access_token, request);
  }
}

/** Cập nhật hồ sơ chủ tài khoản — `PATCH /users/:id` */
export async function patchMyProfile(userId: string, payload: UpdateProfilePayload) {
  const response = await withRefresh<unknown>(`/users/${userId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return response.message ?? "User updated successfully";
}
