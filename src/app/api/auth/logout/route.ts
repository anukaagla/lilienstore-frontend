import { NextResponse } from "next/server";

import {
  buildBackendUrl,
  clearSessionCookies,
  readSessionTokens,
} from "../../../../lib/server/auth-session";

export async function POST() {
  const { refresh } = await readSessionTokens();
  const logoutUrl = buildBackendUrl("/api/auth/logout/");

  if (logoutUrl && refresh) {
    try {
      await fetch(logoutUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh }),
        cache: "no-store",
      });
    } catch {
      // Best effort upstream logout.
    }
  }

  await clearSessionCookies();
  return NextResponse.json({ authenticated: false }, { status: 200 });
}
