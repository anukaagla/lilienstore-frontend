import { NextResponse } from "next/server";

import {
  buildBackendUrl,
  clearSessionCookies,
  extractSessionTokens,
  persistSessionTokens,
  readSessionTokens,
} from "../../../../lib/server/auth-session";

const ME_ENDPOINTS = ["/api/auth/me/", "/api/me/"];

const requestMe = async (accessToken: string) => {
  for (let index = 0; index < ME_ENDPOINTS.length; index += 1) {
    const endpoint = ME_ENDPOINTS[index];
    const meUrl = buildBackendUrl(endpoint);
    if (!meUrl) {
      continue;
    }

    try {
      const response = await fetch(meUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
      });

      if (response.ok) {
        return true;
      }

      const isLastEndpoint = index === ME_ENDPOINTS.length - 1;
      if (response.status !== 404 || isLastEndpoint) {
        return false;
      }
    } catch {
      return false;
    }
  }

  return false;
};

const requestRefresh = async (refreshToken: string) => {
  const refreshUrl = buildBackendUrl("/api/auth/refresh/");
  if (!refreshUrl) {
    return null;
  }

  try {
    const response = await fetch(refreshUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh: refreshToken }),
      cache: "no-store",
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      return null;
    }

    return extractSessionTokens(payload);
  } catch {
    return null;
  }
};

export async function GET() {
  const { access, refresh } = await readSessionTokens();
  if (!access && !refresh) {
    return NextResponse.json({ authenticated: false }, { status: 200 });
  }

  if (access) {
    const authenticated = await requestMe(access);
    if (authenticated) {
      return NextResponse.json({ authenticated: true }, { status: 200 });
    }
  }

  if (refresh) {
    const refreshedTokens = await requestRefresh(refresh);
    if (refreshedTokens) {
      await persistSessionTokens(refreshedTokens);
      const authenticated = await requestMe(refreshedTokens.access);
      if (authenticated) {
        return NextResponse.json({ authenticated: true }, { status: 200 });
      }
    }
  }

  await clearSessionCookies();
  return NextResponse.json({ authenticated: false }, { status: 200 });
}
