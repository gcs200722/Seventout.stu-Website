import { API_URL } from "@/lib/api-fetch";

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

function buildTargetUrl(pathnameParts: string[], requestUrl: string): string {
  const path = pathnameParts.join("/");
  const incomingUrl = new URL(requestUrl);
  const target = new URL(`${API_URL}/${path}`);
  target.search = incomingUrl.search;
  return target.toString();
}

function copyResponseHeaders(source: Headers): Headers {
  const headers = new Headers();
  source.forEach((value, key) => {
    if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
      headers.set(key, value);
    }
  });
  return headers;
}

function buildForwardHeaders(request: Request): Headers {
  const incoming = request.headers;
  const forwarded = new Headers();
  const passthroughKeys = [
    "authorization",
    "content-type",
    "accept",
    "cookie",
    "x-tenant-slug",
    "x-app-scope",
    "x-forwarded-host",
    "host",
  ];
  for (const key of passthroughKeys) {
    const value = incoming.get(key);
    if (value) {
      forwarded.set(key, value);
    }
  }

  if (!forwarded.has("x-forwarded-host")) {
    const host = incoming.get("host");
    if (host) {
      forwarded.set("x-forwarded-host", host);
    }
  }
  return forwarded;
}

async function handle(request: Request, { params }: RouteContext): Promise<Response> {
  const { path } = await params;
  const targetUrl = buildTargetUrl(path, request.url);
  const method = request.method.toUpperCase();
  const hasBody = !["GET", "HEAD"].includes(method);

  const upstream = await fetch(targetUrl, {
    method,
    headers: buildForwardHeaders(request),
    body: hasBody ? request.body : undefined,
    duplex: hasBody ? "half" : undefined,
    cache: "no-store",
  });

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: copyResponseHeaders(upstream.headers),
  });
}

export async function GET(request: Request, context: RouteContext) {
  return handle(request, context);
}
export async function POST(request: Request, context: RouteContext) {
  return handle(request, context);
}
export async function PUT(request: Request, context: RouteContext) {
  return handle(request, context);
}
export async function PATCH(request: Request, context: RouteContext) {
  return handle(request, context);
}
export async function DELETE(request: Request, context: RouteContext) {
  return handle(request, context);
}
export async function OPTIONS(request: Request, context: RouteContext) {
  return handle(request, context);
}
export async function HEAD(request: Request, context: RouteContext) {
  return handle(request, context);
}
