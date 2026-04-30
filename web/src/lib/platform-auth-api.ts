import { getApiErrorMessage } from "@/lib/api-error";
import { apiFetch } from "@/lib/api-fetch";
import type { AuthTokens, LoginPayload, RegisterPayload } from "@/lib/auth-api";

export type PlatformMeResponse = {
  id: string;
  email: string;
  role: string;
  platform_permissions: string[];
};

type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  message?: string;
};

async function readJsonEnvelope(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

async function apiRequestData<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await apiFetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  const json = (await readJsonEnvelope(response)) as ApiEnvelope<T> | { message?: string };
  if (!response.ok) {
    const message = getApiErrorMessage(json, "Platform request failed");
    throw new Error(message);
  }

  if (!("data" in json)) {
    throw new Error("Unexpected API response format");
  }

  return json.data;
}

export function platformLogin(payload: LoginPayload) {
  return apiRequestData<AuthTokens>("/platform/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function platformRegister(payload: RegisterPayload) {
  return apiRequestData<{ user_id: string }>("/platform/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function platformRefreshToken(refresh_token: string) {
  return apiRequestData<{ access_token: string; refresh_token: string }>("/platform/auth/refresh-token", {
    method: "POST",
    body: JSON.stringify({ refresh_token }),
  });
}

export function platformGetMe(accessToken: string) {
  return apiRequestData<PlatformMeResponse>("/platform/auth/me", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export async function platformLogout(accessToken: string): Promise<void> {
  const response = await apiFetch("/platform/auth/logout", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });
  const json = (await readJsonEnvelope(response)) as { success?: boolean; message?: string };
  if (!response.ok) {
    throw new Error(getApiErrorMessage(json, "Logout failed"));
  }
}
