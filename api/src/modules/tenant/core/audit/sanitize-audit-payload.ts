const SENSITIVE_KEY_RE = new RegExp(
  '(password|token|secret|authorization|cookie|refresh|access_token|refresh_token|password_hash|token_hash)',
  'i',
);

function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY_RE.test(key);
}

export function sanitizeAuditValue(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeAuditValue(item));
  }
  if (typeof value === 'object') {
    return sanitizeAuditObject(value as Record<string, unknown>);
  }
  return value;
}

export function sanitizeAuditObject(
  input: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null {
  if (!input || typeof input !== 'object') {
    return null;
  }
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(input)) {
    if (isSensitiveKey(key)) {
      out[key] = '***';
      continue;
    }
    if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
      out[key] = sanitizeAuditObject(val as Record<string, unknown>);
    } else if (Array.isArray(val)) {
      const arr = val as unknown[];
      out[key] = arr.map((item: unknown): unknown =>
        item !== null && typeof item === 'object' && !Array.isArray(item)
          ? sanitizeAuditObject(item as Record<string, unknown>)
          : item,
      );
    } else {
      out[key] = val;
    }
  }
  return out;
}

export function sanitizeAuditEnqueuePayload<
  T extends { before?: unknown; after?: unknown; metadata?: unknown },
>(payload: T): T {
  const clone = { ...payload } as Record<string, unknown>;
  if (clone.before && typeof clone.before === 'object') {
    clone.before = sanitizeAuditObject(clone.before as Record<string, unknown>);
  }
  if (clone.after && typeof clone.after === 'object') {
    clone.after = sanitizeAuditObject(clone.after as Record<string, unknown>);
  }
  if (clone.metadata && typeof clone.metadata === 'object') {
    clone.metadata = sanitizeAuditObject(
      clone.metadata as Record<string, unknown>,
    );
  }
  return clone as T;
}
