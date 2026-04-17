import { getApiErrorMessage } from "@/lib/api-error";

export type LoginPayload = {
  email: string;
  password: string;
};

export type RegisterPayload = {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  phone: string;
};

export type AuthTokens = {
  access_token: string;
  refresh_token: string;
};

export type MeResponse = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
};

type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  message?: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  const json = (await response.json()) as ApiEnvelope<T> | { message?: string };
  if (!response.ok) {
    const message = getApiErrorMessage(json, "Authentication request failed");
    throw new Error(message);
  }

  if (!("data" in json)) {
    throw new Error("Unexpected API response format");
  }

  return json.data;
}

export function login(payload: LoginPayload) {
  return apiRequest<AuthTokens>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function register(payload: RegisterPayload) {
  return apiRequest<{ user_id: string }>("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getMe(accessToken: string) {
  return apiRequest<MeResponse>("/auth/me", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export function refreshToken(refresh_token: string) {
  return apiRequest<{ access_token: string; refresh_token: string }>("/auth/refresh-token", {
    method: "POST",
    body: JSON.stringify({ refresh_token }),
  });
}

export function logout(accessToken: string) {
  return apiRequest<unknown>("/auth/logout", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}
