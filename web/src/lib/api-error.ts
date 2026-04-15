type ApiErrorPayload = {
  success?: boolean;
  message?: string;
  error?: {
    code?: string;
    message?: string | string[];
    details?: Record<string, unknown>;
  };
};

function normalizeMessage(message: unknown, fallback: string): string {
  if (typeof message === "string" && message.trim().length > 0) {
    return message;
  }
  if (Array.isArray(message) && message.length > 0) {
    return message.filter((item): item is string => typeof item === "string").join(", ");
  }
  return fallback;
}

function formatDetails(details: Record<string, unknown> | undefined): string | null {
  if (!details) {
    return null;
  }
  const entries = Object.entries(details);
  if (entries.length === 0) {
    return null;
  }
  return entries
    .map(([key, value]) => {
      if (Array.isArray(value)) {
        return `- ${key}: ${value.join(", ")}`;
      }
      if (value === null || value === undefined) {
        return `- ${key}: -`;
      }
      return `- ${key}: ${String(value)}`;
    })
    .join("\n");
}

export function getApiErrorMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== "object") {
    return fallback;
  }

  const apiPayload = payload as ApiErrorPayload;
  const primaryMessage = normalizeMessage(
    apiPayload.error?.message ?? apiPayload.message,
    fallback,
  );
  const detailsText = formatDetails(apiPayload.error?.details);
  if (!detailsText) {
    return primaryMessage;
  }
  return `${primaryMessage}\n${detailsText}`;
}
