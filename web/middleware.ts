import { NextResponse, type NextRequest } from "next/server";
import {
  decidePlatformRewrite,
  shouldBypassMiddlewarePath,
  shouldEmitDevTenantCookie,
} from "./lib/middleware/routing-policy";
import {
  DEFAULT_ROOT_DOMAIN,
  normalizeHost,
  resolveTenantFromCandidateHosts,
} from "./lib/middleware/tenant-from-host";

export function middleware(request: NextRequest) {
  const rootDomain =
    process.env.NEXT_PUBLIC_PLATFORM_ROOT_DOMAIN?.trim().toLowerCase() ||
    DEFAULT_ROOT_DOMAIN;
  const configuredDevHost = process.env.NEXT_PUBLIC_PLATFORM_DEV_HOST?.trim() ?? null;

  const requestHeaders = new Headers(request.headers);
  const headerHost = normalizeHost(
    request.headers.get("x-forwarded-host") ?? request.headers.get("host"),
  );
  const urlHost = request.nextUrl.hostname.trim().toLowerCase();
  const candidateHosts = [headerHost, urlHost].filter(Boolean);

  const { platformHost, tenantSlug } = resolveTenantFromCandidateHosts(
    candidateHosts,
    rootDomain,
    { configuredDevHost },
  );

  if (tenantSlug) {
    requestHeaders.set("x-tenant-slug", tenantSlug);
    requestHeaders.set("x-app-scope", "tenant");
  } else if (platformHost) {
    requestHeaders.set("x-app-scope", "platform");
  }

  const pathname = request.nextUrl.pathname;

  if (shouldBypassMiddlewarePath(pathname)) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  const rewrite = decidePlatformRewrite(pathname, platformHost);
  if (rewrite.kind === "rewrite") {
    const rewrittenUrl = request.nextUrl.clone();
    rewrittenUrl.pathname = rewrite.pathname;
    return NextResponse.rewrite(rewrittenUrl, { request: { headers: requestHeaders } });
  }

  if (
    shouldEmitDevTenantCookie({
      nodeEnv: process.env.NODE_ENV ?? "development",
      tenantSlug,
      hasTenantSlugCookie: request.cookies.has("tenant_slug"),
    })
  ) {
    const response = NextResponse.next({ request: { headers: requestHeaders } });
    response.cookies.set("tenant_slug", tenantSlug!, {
      path: "/",
      sameSite: "lax",
      httpOnly: false,
      secure: false,
    });
    return response;
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map)$).*)",
  ],
};
