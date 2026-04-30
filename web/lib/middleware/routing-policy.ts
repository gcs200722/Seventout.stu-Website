/**
 * Pure routing decisions for Next.js middleware (platform rewrites, path bypass).
 */

/** Paths handled without tenant/platform rewrites (framework, API, static assets). */
export function shouldBypassMiddlewarePath(pathname: string): boolean {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname === "/favicon.ico" ||
    /\.[a-zA-Z0-9]+$/.test(pathname)
  );
}

export type PlatformRewriteDecision =
  | { kind: "none" }
  | { kind: "rewrite"; pathname: string };

/**
 * When the request hits the platform host, map URL paths to the `/platform` app segment.
 */
export function decidePlatformRewrite(
  pathname: string,
  platformHost: boolean,
): PlatformRewriteDecision {
  if (!platformHost) {
    return { kind: "none" };
  }
  if (pathname === "/platform-admin") {
    return { kind: "rewrite", pathname: "/platform" };
  }
  if (!pathname.startsWith("/platform")) {
    return {
      kind: "rewrite",
      pathname: pathname === "/" ? "/platform" : `/platform${pathname}`,
    };
  }
  return { kind: "none" };
}

export function shouldEmitDevTenantCookie(params: {
  nodeEnv: string;
  tenantSlug: string | null;
  hasTenantSlugCookie: boolean;
}): boolean {
  return (
    params.nodeEnv !== "production" &&
    Boolean(params.tenantSlug) &&
    !params.hasTenantSlugCookie
  );
}
