import { NextRequest, NextResponse } from "next/server";

import {
  buildBackendUrl,
  readSessionTokens,
} from "../../../../lib/server/auth-session";

const ALLOWED_METHODS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE"]);
const ALLOWED_ROOT_SEGMENTS = new Set(["auth", "cart", "me", "orders"]);
const BODYLESS_RESPONSE_STATUSES = new Set([204, 205, 304]);
const VALID_PATH_SEGMENT = /^[A-Za-z0-9._~:@-]+$/;
const MAX_JSON_BODY_SIZE = 64_000;

type RouteContext = {
  params: Promise<{
    path?: string[];
  }>;
};

const normalizePath = (segments: string[]) => {
  if (!segments.length) {
    return null;
  }

  const root = segments[0];
  if (!ALLOWED_ROOT_SEGMENTS.has(root)) {
    return null;
  }

  for (const segment of segments) {
    if (
      !segment ||
      segment === "." ||
      segment === ".." ||
      !VALID_PATH_SEGMENT.test(segment)
    ) {
      return null;
    }
  }

  return segments.join("/");
};

const buildUpstreamHeaders = (request: NextRequest, accessToken: string) => {
  const headers = new Headers();
  headers.set("Authorization", `Bearer ${accessToken}`);

  const contentType = request.headers.get("content-type");
  if (contentType) {
    headers.set("Content-Type", contentType);
  }

  return headers;
};

const parseForwardBody = async (request: NextRequest) => {
  if (request.method === "GET" || request.method === "HEAD") {
    return null;
  }

  const text = await request.text();
  if (!text) {
    return null;
  }

  if (text.length > MAX_JSON_BODY_SIZE) {
    return undefined;
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      JSON.parse(text);
    } catch {
      return undefined;
    }
  }

  return text;
};

const proxyRequest = async (request: NextRequest, context: RouteContext) => {
  if (!ALLOWED_METHODS.has(request.method)) {
    return NextResponse.json({ detail: "Method not allowed." }, { status: 405 });
  }

  const params = await context.params;
  const pathSegments = Array.isArray(params.path) ? params.path : [];
  const normalizedPath = normalizePath(pathSegments);
  if (!normalizedPath) {
    return NextResponse.json({ detail: "Invalid proxy path." }, { status: 400 });
  }

  const upstreamUrl = buildBackendUrl(`/api/${normalizedPath}/`);
  if (!upstreamUrl) {
    return NextResponse.json({ detail: "API base URL is missing." }, { status: 500 });
  }
  upstreamUrl.search = request.nextUrl.search;

  const { access } = await readSessionTokens();
  if (!access) {
    return NextResponse.json({ detail: "Authentication required." }, { status: 401 });
  }

  const body = await parseForwardBody(request);
  if (body === undefined) {
    return NextResponse.json({ detail: "Invalid request body." }, { status: 400 });
  }

  try {
    const upstreamResponse = await fetch(upstreamUrl, {
      method: request.method,
      headers: buildUpstreamHeaders(request, access),
      body: body ?? undefined,
      cache: "no-store",
    });

    const responseHeaders = new Headers();
    const contentType = upstreamResponse.headers.get("content-type");
    const isBodylessResponse = BODYLESS_RESPONSE_STATUSES.has(upstreamResponse.status);
    if (contentType && !isBodylessResponse) {
      responseHeaders.set("Content-Type", contentType);
    }

    if (isBodylessResponse) {
      return new NextResponse(null, {
        status: upstreamResponse.status,
        headers: responseHeaders,
      });
    }

    const buffer = await upstreamResponse.arrayBuffer();
    return new NextResponse(buffer, {
      status: upstreamResponse.status,
      headers: responseHeaders,
    });
  } catch {
    return NextResponse.json({ detail: "Upstream request failed." }, { status: 502 });
  }
};

export async function GET(request: NextRequest, context: RouteContext) {
  return proxyRequest(request, context);
}

export async function POST(request: NextRequest, context: RouteContext) {
  return proxyRequest(request, context);
}

export async function PUT(request: NextRequest, context: RouteContext) {
  return proxyRequest(request, context);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  return proxyRequest(request, context);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  return proxyRequest(request, context);
}
