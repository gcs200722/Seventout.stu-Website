/**
 * Pure helpers: derive tenant slug and platform scope from Host / X-Forwarded-Host.
 * Used by root {@link ../../middleware.ts}.
 */

export const DEFAULT_ROOT_DOMAIN = "localtest.me";

export const RESERVED_SUBDOMAINS = new Set(["www", "admin", "api"]);

export function normalizeHost(hostHeader: string | null): string {
  if (!hostHeader) {
    return "";
  }
  return hostHeader.split(",")[0]?.trim().toLowerCase() ?? "";
}

export function stripPort(host: string): string {
  return host.split(":")[0] ?? host;
}

export function resolveTenantSlug(host: string, rootDomain: string): string | null {
  const hostname = stripPort(host);
  if (!hostname.endsWith(`.${rootDomain}`)) {
    return null;
  }
  const subdomain = hostname.slice(0, -`.${rootDomain}`.length);
  if (!subdomain || RESERVED_SUBDOMAINS.has(subdomain)) {
    return null;
  }
  return subdomain;
}

export function isPlatformHost(
  host: string,
  rootDomain: string,
  options?: { configuredDevHost?: string | null },
): boolean {
  const hostname = stripPort(host);
  const allowedHosts = new Set<string>([`admin.${rootDomain}`, rootDomain]);

  const configuredDevHost = options?.configuredDevHost?.trim().toLowerCase();
  if (configuredDevHost) {
    allowedHosts.add(configuredDevHost);
  }

  return allowedHosts.has(hostname);
}

export function resolveTenantFromCandidateHosts(
  candidateHosts: string[],
  rootDomain: string,
  options?: { configuredDevHost?: string | null },
): { platformHost: boolean; tenantSlug: string | null } {
  const platformHost = candidateHosts.some((host) =>
    isPlatformHost(host, rootDomain, options),
  );
  const tenantSlug =
    candidateHosts
      .map((host) => resolveTenantSlug(host, rootDomain))
      .find((slug) => Boolean(slug)) ?? null;
  return { platformHost, tenantSlug };
}
