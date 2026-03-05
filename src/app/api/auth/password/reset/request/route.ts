import { NextRequest, NextResponse } from "next/server";

import { buildBackendUrl } from "../../../../../../lib/server/auth-session";

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

const readUpstreamPayload = async (response: Response) => {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return response.json().catch(() => null);
  }

  const text = await response.text().catch(() => "");
  if (text) {
    return { detail: text };
  }

  return null;
};

export async function POST(request: NextRequest) {
  const body = await parsePayload(request);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ detail: "Invalid request body." }, { status: 400 });
  }

  const record = body as Record<string, unknown>;
  const email = normalizeEmail(record.email);
  if (!email || email.length > 254) {
    return NextResponse.json({ detail: "Invalid email." }, { status: 400 });
  }

  const resetRequestUrl = buildBackendUrl("/api/auth/password/reset/request/");
  if (!resetRequestUrl) {
    return NextResponse.json({ detail: "API base URL is missing." }, { status: 500 });
  }

  try {
    const upstreamResponse = await fetch(resetRequestUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
      cache: "no-store",
    });

    const payload = await readUpstreamPayload(upstreamResponse);
    if (!upstreamResponse.ok) {
      return NextResponse.json(
        payload ?? { detail: "Failed to request password reset." },
        { status: upstreamResponse.status },
      );
    }

    return NextResponse.json(
      payload ?? { detail: "Password reset requested." },
      { status: upstreamResponse.status },
    );
  } catch {
    return NextResponse.json({ detail: "Failed to request password reset." }, { status: 502 });
  }
}
