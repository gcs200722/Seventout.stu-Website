import { refreshToken } from "@/lib/auth-api";
import { getStoredTokens, setStoredAccessToken } from "@/lib/auth-storage";

type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  message?: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export type AdminUser = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  role: string;
};

export type ApiMessage = {
  message: string;
};

async function requestWithToken<T>(path: string, accessToken: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  const json = (await response.json()) as ApiEnvelope<T> | { message?: string };
  if (!response.ok) {
    const message =
      "message" in json && typeof json.message === "string"
        ? json.message
        : "Admin request failed";
    throw new Error(message);
  }

  if (!("data" in json)) {
    throw new Error("Unexpected API response format");
  }

  return json.data;
}

async function getAccessTokenForRequest() {
  const tokens = getStoredTokens();
  if (!tokens?.access_token) {
    throw new Error("Bạn chưa đăng nhập.");
  }
  return tokens;
}

async function withRefresh<T>(path: string): Promise<T> {
  const tokens = await getAccessTokenForRequest();

  try {
    return await requestWithToken<T>(path, tokens.access_token);
  } catch (error) {
    if (!(error instanceof Error) || !/unauthorized|forbidden|jwt/i.test(error.message)) {
      throw error;
    }

    if (!tokens.refresh_token) {
      throw error;
    }

    const refreshed = await refreshToken(tokens.refresh_token);
    setStoredAccessToken(refreshed.access_token);
    return requestWithToken<T>(path, refreshed.access_token);
  }
}

export function getAdminUsers() {
  return withRefresh<AdminUser[]>("/users");
}

export function getAdminOrders() {
  return withRefresh<ApiMessage>("/orders");
}
