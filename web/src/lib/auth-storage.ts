import type { AuthTokens } from "./auth-api";

const ACCESS_TOKEN_KEY = "s7_access_token";
const REFRESH_TOKEN_KEY = "s7_refresh_token";
export const AUTH_TOKENS_CHANGED_EVENT = "auth:tokens-changed";

function dispatchAuthTokensChanged() {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new Event(AUTH_TOKENS_CHANGED_EVENT));
}

export function getStoredTokens(): AuthTokens | null {
  if (typeof window === "undefined") {
    return null;
  }

  const access_token = localStorage.getItem(ACCESS_TOKEN_KEY);
  const refresh_token = localStorage.getItem(REFRESH_TOKEN_KEY);

  if (!access_token || !refresh_token) {
    return null;
  }

  return { access_token, refresh_token };
}

export function setStoredTokens(tokens: AuthTokens) {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access_token);
  localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token);
  dispatchAuthTokensChanged();
}

export function setStoredAccessToken(access_token: string) {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(ACCESS_TOKEN_KEY, access_token);
  dispatchAuthTokensChanged();
}

export function clearStoredTokens() {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  dispatchAuthTokensChanged();
}
