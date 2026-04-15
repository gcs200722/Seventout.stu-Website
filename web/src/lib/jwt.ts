export type AccessTokenClaims = {
  user_id?: string;
  role?: string;
  permissions?: string[];
};

function decodeBase64Url(value: string): string {
  if (typeof window === "undefined") {
    return "";
  }

  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  return atob(padded);
}

export function parseAccessTokenClaims(accessToken: string): AccessTokenClaims | null {
  try {
    const parts = accessToken.split(".");
    if (parts.length < 2) {
      return null;
    }

    const payload = decodeBase64Url(parts[1]);
    const parsed = JSON.parse(payload) as AccessTokenClaims;
    return parsed;
  } catch {
    return null;
  }
}
