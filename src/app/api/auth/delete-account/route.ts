import { NextResponse } from "next/server";

import {
  buildBackendUrl,
  clearSessionCookies,
  readSessionTokens,
} from "../../../../lib/server/auth-session";

const DELETE_ENDPOINTS = ["/api/auth/me/", "/api/me/"];
const BODYLESS_RESPONSE_STATUSES = new Set([204, 205, 304]);

export async function DELETE() {
  const { access } = await readSessionTokens();
  if (!access) {
    return NextResponse.json({ detail: "Authentication required." }, { status: 401 });
  }

  const deleteUrls = DELETE_ENDPOINTS.map((endpoint) => buildBackendUrl(endpoint)).filter(
    (url): url is URL => Boolean(url)
  );

  if (!deleteUrls.length) {
    return NextResponse.json({ detail: "API base URL is missing." }, { status: 500 });
  }

  let upstreamResponse: Response | null = null;

  for (let index = 0; index < deleteUrls.length; index += 1) {
    const url = deleteUrls[index];
    const isLast = index === deleteUrls.length - 1;

    try {
      const nextResponse = await fetch(url, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${access}`,
        },
        cache: "no-store",
      });

      upstreamResponse = nextResponse;

      const canTryFallback =
        nextResponse.status === 404 ||
        nextResponse.status === 405 ||
        nextResponse.status === 502;

      if (nextResponse.ok || !canTryFallback || isLast) {
        break;
      }
    } catch {
      if (isLast) {
        upstreamResponse = null;
      }
    }
  }

  if (!upstreamResponse) {
    return NextResponse.json({ detail: "Upstream request failed." }, { status: 502 });
  }

  if (upstreamResponse.ok) {
    await clearSessionCookies();
  }

  const headers = new Headers();
  const contentType = upstreamResponse.headers.get("content-type");
  const isBodylessResponse = BODYLESS_RESPONSE_STATUSES.has(upstreamResponse.status);
  if (contentType && !isBodylessResponse) {
    headers.set("Content-Type", contentType);
  }

  if (isBodylessResponse) {
    return new NextResponse(null, {
      status: upstreamResponse.status,
      headers,
    });
  }

  const buffer = await upstreamResponse.arrayBuffer();
  return new NextResponse(buffer, {
    status: upstreamResponse.status,
    headers,
  });
}
