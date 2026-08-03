import "server-only";

import { headers } from "next/headers";

// Shared secret agreed with the backend (BACKEND_RESPONSE.md §1). Without it the
// backend ignores the visitor headers entirely and falls back to CF-IPCountry —
// which, for anything we fetch server-side, resolves to this server rather than
// the visitor. Must never become NEXT_PUBLIC_*.
const INTERNAL_PROXY_TOKEN = process.env.INTERNAL_PROXY_TOKEN ?? "";

// Cloudflare reports XX for unknown and T1 for Tor; the backend maps both to GEL,
// so there is nothing to gain by forwarding them.
const UNRESOLVED_COUNTRIES = new Set(["XX", "T1"]);

// Crawlers hit us from wherever Google happens to be. Pinning catalog indexing to
// GE keeps GEL-only products in the sitemap and out of soft 404s.
export const INDEXING_COUNTRY = "GE";

export type VisitorContext = {
  country: string;
  ip: string;
};

export const EMPTY_VISITOR_CONTEXT: VisitorContext = { country: "", ip: "" };

const normalizeCountry = (value: string | null) => {
  const code = value?.trim().toUpperCase() ?? "";
  if (!/^[A-Z]{2}$/.test(code) || UNRESOLVED_COUNTRIES.has(code)) {
    return "";
  }
  return code;
};

const normalizeIp = (value: string | null) => {
  const ip = value?.trim() ?? "";
  // Only ever forward a single address; X-Forwarded-For arrives as a chain.
  return ip.includes(",") ? ip.split(",")[0].trim() : ip;
};

export const readVisitorContext = async (): Promise<VisitorContext> => {
  try {
    const requestHeaders = await headers();
    return {
      country: normalizeCountry(requestHeaders.get("cf-ipcountry")),
      ip:
        normalizeIp(requestHeaders.get("cf-connecting-ip")) ||
        normalizeIp(requestHeaders.get("x-forwarded-for")),
    };
  } catch {
    // headers() is unavailable outside a request scope (build-time rendering).
    return EMPTY_VISITOR_CONTEXT;
  }
};

export const buildVisitorHeaders = (
  visitor: VisitorContext,
  init?: HeadersInit,
): Headers => {
  const requestHeaders = new Headers(init);

  // The backend fails closed: unsigned visitor headers are dropped, so sending
  // them without the token would only cost bytes.
  if (!INTERNAL_PROXY_TOKEN) {
    return requestHeaders;
  }

  requestHeaders.set("X-Internal-Token", INTERNAL_PROXY_TOKEN);
  if (visitor.country) {
    requestHeaders.set("X-Visitor-Country", visitor.country);
  }
  if (visitor.ip) {
    requestHeaders.set("X-Visitor-IP", visitor.ip);
  }

  return requestHeaders;
};
