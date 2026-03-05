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
  const token = normalizeString(record.token);
  const newPassword = normalizeString(record.new_password);
  const newPassword2 = normalizeString(record.new_password2);

  if (
    !email ||
    !token ||
    !newPassword ||
    !newPassword2 ||
    email.length > 254 ||
    token.length > 1024 ||
    newPassword.length > 512 ||
    newPassword2.length > 512
  ) {
    return NextResponse.json({ detail: "Invalid password reset payload." }, { status: 400 });
  }

  const confirmUrl = buildBackendUrl("/api/auth/password/reset/confirm/");
  if (!confirmUrl) {
    return NextResponse.json({ detail: "API base URL is missing." }, { status: 500 });
  }

  try {
    const upstreamResponse = await fetch(confirmUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        token,
        new_password: newPassword,
        new_password2: newPassword2,
      }),
      cache: "no-store",
    });

    const payload = await readUpstreamPayload(upstreamResponse);
    if (!upstreamResponse.ok) {
      return NextResponse.json(
        payload ?? { detail: "Failed to reset password." },
        { status: upstreamResponse.status },
      );
    }

    return NextResponse.json(
      payload ?? { detail: "Password was reset." },
      { status: upstreamResponse.status },
    );
  } catch {
    return NextResponse.json({ detail: "Failed to reset password." }, { status: 502 });
  }
}
