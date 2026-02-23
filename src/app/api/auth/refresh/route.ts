import { NextResponse } from "next/server";

import {
  buildBackendUrl,
  clearSessionCookies,
  extractSessionTokens,
  persistSessionTokens,
  readSessionTokens,
} from "../../../../lib/server/auth-session";

export async function POST() {
  const { refresh } = await readSessionTokens();
  if (!refresh) {
    await clearSessionCookies();
    return NextResponse.json({ detail: "No refresh token." }, { status: 401 });
  }

  const refreshUrl = buildBackendUrl("/api/auth/refresh/");
  if (!refreshUrl) {
    return NextResponse.json({ detail: "API base URL is missing." }, { status: 500 });
  }

  try {
    const upstreamResponse = await fetch(refreshUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
      cache: "no-store",
    });

    const payload = await upstreamResponse.json().catch(() => null);
    if (!upstreamResponse.ok) {
      if (
        upstreamResponse.status === 400 ||
        upstreamResponse.status === 401 ||
        upstreamResponse.status === 403
      ) {
        await clearSessionCookies();
      }
      return NextResponse.json(
        payload ?? { detail: "Token refresh failed." },
        { status: upstreamResponse.status },
      );
    }

    const tokens = extractSessionTokens(payload);
    if (!tokens) {
      await clearSessionCookies();
      return NextResponse.json(
        { detail: "Invalid auth token payload." },
        { status: 502 },
      );
    }

    await persistSessionTokens(tokens);
    return NextResponse.json({ authenticated: true }, { status: 200 });
  } catch {
    return NextResponse.json({ detail: "Token refresh failed." }, { status: 502 });
  }
}
