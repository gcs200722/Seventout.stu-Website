const STORAGE_KEY = "seventout_guest_session_id";

export function rememberGuestSessionIdFromResponse(response: Response): void {
  if (typeof window === "undefined") {
    return;
  }
  const id = response.headers.get("x-guest-session-id")?.trim();
  if (id) {
    sessionStorage.setItem(STORAGE_KEY, id);
  }
}

export function getGuestSessionIdForApi(): string | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }
  const v = sessionStorage.getItem(STORAGE_KEY)?.trim();
  return v && v.length > 0 ? v : undefined;
}

export function clearGuestSessionId(): void {
  if (typeof window === "undefined") {
    return;
  }
  sessionStorage.removeItem(STORAGE_KEY);
}
