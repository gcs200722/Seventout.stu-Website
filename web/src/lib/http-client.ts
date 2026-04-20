import { getApiErrorMessage } from "@/lib/api-error";
import { apiFetch } from "@/lib/api-fetch";
import { refreshToken } from "@/lib/auth-api";
import { getStoredTokens, setStoredTokens } from "@/lib/auth-storage";

type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

type ApiEnvelope<T> = {
  success: boolean;
  data?: T;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
  };
};

type AuthorizedRequest = {
  method?: HttpMethod;
  body?: string;
  headers?: Record<string, string>;
};

async function requestWithToken<T>(
  path: string,
  accessToken: string,
  request: AuthorizedRequest = {},
): Promise<ApiEnvelope<T>> {
  const response = await apiFetch(path, {
    method: request.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...(request.headers ?? {}),
    },
    body: request.body,
    cache: "no-store",
  });

  const jsonUnknown = (await response.json()) as unknown;
  if (!response.ok) {
    throw new Error(getApiErrorMessage(jsonUnknown, "Request failed"));
  }
  return jsonUnknown as ApiEnvelope<T>;
}

export async function withAuth<T>(path: string, request: AuthorizedRequest = {}) {
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
