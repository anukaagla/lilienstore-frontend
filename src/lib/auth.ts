const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

const normalizeString = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const normalizeApiOrigin = () => {
  if (!API_BASE_URL) {
    return "";
  }

  try {
    return new URL(API_BASE_URL).origin;
  } catch {
    return "";
  }
};

const API_ORIGIN = normalizeApiOrigin();

let refreshRequest: Promise<boolean> | null = null;

const mapApiPathToProxyPath = (pathname: string, search = "") => {
  if (!pathname.startsWith("/api/")) {
    return null;
  }
  const pathWithoutApiPrefix = pathname.slice(5).replace(/^\/+/, "");
  if (!pathWithoutApiPrefix) {
    return null;
  }
  return `/api/proxy/${pathWithoutApiPrefix}${search}`;
};

const toProxyRequestInput = (input: RequestInfo | URL): RequestInfo | URL => {
  if (typeof input === "string") {
    if (input.startsWith("/api/")) {
      return mapApiPathToProxyPath(input, "") ?? input;
    }

    if (!/^https?:\/\//i.test(input)) {
      return input;
    }

    try {
      const parsed = new URL(input);
      if (API_ORIGIN && parsed.origin === API_ORIGIN) {
        return mapApiPathToProxyPath(parsed.pathname, parsed.search) ?? input;
      }
      return input;
    } catch {
      return input;
    }
  }

  if (input instanceof URL) {
    if (API_ORIGIN && input.origin === API_ORIGIN) {
      return mapApiPathToProxyPath(input.pathname, input.search) ?? input;
    }
  }

  return input;
};

const requestSessionRefresh = async () => {
  try {
    const response = await fetch("/api/auth/refresh/", {
      method: "POST",
      cache: "no-store",
      credentials: "include",
    });
    return response.ok;
  } catch {
    return false;
  }
};

export const refreshAuthTokens = async () => {
  if (refreshRequest) {
    return refreshRequest;
  }

  refreshRequest = requestSessionRefresh().finally(() => {
    refreshRequest = null;
  });

  return refreshRequest;
};

export const clearLegacyAuthStorage = () => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem("access");
  window.localStorage.removeItem("refresh");
  window.localStorage.removeItem("user");
  window.sessionStorage.removeItem("lilien-logged-in");
};

export const fetchAuthSession = async (): Promise<{ authenticated: boolean } | null> => {
  try {
    const response = await fetch("/api/auth/session/", {
      method: "GET",
      cache: "no-store",
      credentials: "include",
    });
    if (!response.ok) {
      return null;
    }

    const payload = await response.json().catch(() => null);
    if (!payload || typeof payload !== "object") {
      return null;
    }

    return {
      authenticated: Boolean((payload as { authenticated?: unknown }).authenticated),
    };
  } catch {
    return null;
  }
};

export const fetchWithAuthRetry = async (
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response | null> => {
  const requestInput = toProxyRequestInput(input);

  const sendRequest = () =>
    fetch(requestInput, {
      ...init,
      credentials: "include",
    });

  try {
    const response = await sendRequest();
    if (response.status !== 401) {
      return response;
    }

    const refreshed = await refreshAuthTokens();
    if (!refreshed) {
      return response;
    }

    return sendRequest();
  } catch {
    return null;
  }
};

export const hasStoredAuthToken = () => false;

export const getStoredAccessToken = () => normalizeString("");

export const getStoredRefreshToken = () => normalizeString("");
