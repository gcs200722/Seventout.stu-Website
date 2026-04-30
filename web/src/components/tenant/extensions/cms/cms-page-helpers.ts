import type { CSSProperties } from "react";

/** Mobile UA sniffing for CMS section `targeting.device` (server-safe stub). */
export function isMobileUserAgent(userAgent: string): boolean {
  return /Mobile|Android|iPhone|iPad/i.test(userAgent);
}

export function sectionMatchesTargeting(
  targeting: Record<string, unknown> | undefined,
  userAgent: string,
): boolean {
  if (!targeting || typeof targeting !== "object") {
    return true;
  }
  const device = typeof targeting.device === "string" ? targeting.device : "all";
  if (device === "mobile") {
    return isMobileUserAgent(userAgent);
  }
  if (device === "desktop") {
    return !isMobileUserAgent(userAgent);
  }
  return true;
}

function parseCookies(cookieHeader: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!cookieHeader || cookieHeader.length === 0) {
    return out;
  }
  for (const part of cookieHeader.split(";")) {
    const idx = part.indexOf("=");
    if (idx <= 0) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k) {
      out[k] = decodeURIComponent(v);
    }
  }
  return out;
}

/** Merge `data.i18n[locale]` shallow into data when present (Phase 4 i18n stub). */
export function mergeBlockLocale<T extends Record<string, unknown>>(data: T, locale: string): T {
  const i18n = data.i18n;
  if (!i18n || typeof i18n !== "object" || Array.isArray(i18n)) {
    return data;
  }
  const pack = (i18n as Record<string, unknown>)[locale];
  if (!pack || typeof pack !== "object" || Array.isArray(pack)) {
    return data;
  }
  return { ...data, ...pack } as T;
}

/**
 * Minimal A/B: `experiment: { key, arms: string[] }` picks one arm via cookie `cms_exp_{key}`,
 * then merges `data.i18n[arm]` when defined.
 */
export function mergeBlockExperiment<T extends Record<string, unknown>>(
  data: T,
  cookieHeader: string | null,
): T {
  const ex = data.experiment;
  if (!ex || typeof ex !== "object" || Array.isArray(ex)) {
    return data;
  }
  const key = typeof (ex as { key?: unknown }).key === "string" ? (ex as { key: string }).key.trim() : "";
  const armsRaw = (ex as { arms?: unknown }).arms;
  const arms = Array.isArray(armsRaw) ? armsRaw.filter((a): a is string => typeof a === "string") : [];
  if (!key || arms.length < 2) {
    return data;
  }
  const cookies = parseCookies(cookieHeader);
  const cname = `cms_exp_${key}`;
  let arm = cookies[cname];
  if (!arm || !arms.includes(arm)) {
    arm = arms[Math.floor(Math.random() * arms.length)]!;
  }
  const i18n = data.i18n;
  if (!i18n || typeof i18n !== "object" || Array.isArray(i18n)) {
    return data;
  }
  const pack = (i18n as Record<string, unknown>)[arm];
  if (!pack || typeof pack !== "object" || Array.isArray(pack)) {
    return data;
  }
  const rest = { ...data };
  delete (rest as Record<string, unknown>).experiment;
  return { ...rest, ...pack } as T;
}

export function themeStyleFromTokens(tokens: Record<string, string> | undefined): CSSProperties {
  if (!tokens || typeof tokens !== "object") {
    return {};
  }
  const style: Record<string, string> = {};
  for (const [k, v] of Object.entries(tokens)) {
    if (typeof v !== "string") continue;
    const cssKey = k.startsWith("--") ? k : `--cms-${k}`;
    style[cssKey] = v;
  }
  return style as CSSProperties;
}
