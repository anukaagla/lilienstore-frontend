import "server-only";

import { cookies } from "next/headers";

const ACCESS_COOKIE_NAME = "lilien_access";
const REFRESH_COOKIE_NAME = "lilien_refresh";

const ACCESS_MAX_AGE_SECONDS = 60 * 15;
const REFRESH_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

const normalizeToken = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

export type SessionTokens = {
  access: string;
  refresh: string;
};

export const getApiBaseUrl = () => {
  const value = process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
  return value.trim();
};

export const buildBackendUrl = (path: string) => {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) return null;

  try {
    return new URL(path, baseUrl);
  } catch {
    return null;
  }
};

export const readSessionTokens = async () => {
  const cookieStore = await cookies();
  const access = normalizeToken(cookieStore.get(ACCESS_COOKIE_NAME)?.value);
  const refresh = normalizeToken(cookieStore.get(REFRESH_COOKIE_NAME)?.value);

  return {
    access,
    refresh,
  };
};

export const clearSessionCookies = async () => {
  const cookieStore = await cookies();
  cookieStore.set(ACCESS_COOKIE_NAME, "", {
    ...cookieOptions,
    maxAge: 0,
  });
  cookieStore.set(REFRESH_COOKIE_NAME, "", {
    ...cookieOptions,
    maxAge: 0,
  });
};

export const persistSessionTokens = async (tokens: SessionTokens) => {
  const cookieStore = await cookies();
  cookieStore.set(ACCESS_COOKIE_NAME, tokens.access, {
    ...cookieOptions,
    maxAge: ACCESS_MAX_AGE_SECONDS,
  });
  cookieStore.set(REFRESH_COOKIE_NAME, tokens.refresh, {
    ...cookieOptions,
    maxAge: REFRESH_MAX_AGE_SECONDS,
  });
};

export const extractSessionTokens = (payload: unknown): SessionTokens | null => {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const record = payload as { access?: unknown; refresh?: unknown };
  const access = normalizeToken(record.access);
  const refresh = normalizeToken(record.refresh);

  if (!access || !refresh) {
    return null;
  }

  return { access, refresh };
};

