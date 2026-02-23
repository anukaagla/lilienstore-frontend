import { NextRequest, NextResponse } from "next/server";

import {
  buildBackendUrl,
  extractSessionTokens,
  persistSessionTokens,
} from "../../../../lib/server/auth-session";

const normalizeString = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const normalizeEmail = (value: unknown) => normalizeString(value).toLowerCase();

const parsePayload = async (request: NextRequest) => {
  try {
    return (await request.json()) as unknown;
  } catch {
    return null;
  }
};

export async function POST(request: NextRequest) {
  const body = await parsePayload(request);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ detail: "Invalid request body." }, { status: 400 });
  }

  const record = body as Record<string, unknown>;
  const email = normalizeEmail(record.email);
  const password = normalizeString(record.password);

  if (!email || !password || email.length > 254 || password.length > 512) {
    return NextResponse.json({ detail: "Invalid email or password." }, { status: 400 });
  }

  const loginUrl = buildBackendUrl("/api/auth/login/");
  if (!loginUrl) {
    return NextResponse.json({ detail: "API base URL is missing." }, { status: 500 });
  }

  try {
    const upstreamResponse = await fetch(loginUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      cache: "no-store",
    });

    const payload = await upstreamResponse.json().catch(() => null);
    if (!upstreamResponse.ok) {
      return NextResponse.json(payload ?? { detail: "Login failed." }, { status: upstreamResponse.status });
    }

    const tokens = extractSessionTokens(payload);
    if (!tokens) {
      return NextResponse.json({ detail: "Invalid auth token payload." }, { status: 502 });
    }

    await persistSessionTokens(tokens);

    if (payload && typeof payload === "object" && !Array.isArray(payload)) {
      const safePayload = { ...(payload as Record<string, unknown>) };
      delete safePayload.access;
      delete safePayload.refresh;
      return NextResponse.json(
        { ...safePayload, authenticated: true },
        { status: 200 },
      );
    }

    return NextResponse.json({ authenticated: true }, { status: 200 });
  } catch {
    return NextResponse.json({ detail: "Login failed." }, { status: 502 });
  }
}
