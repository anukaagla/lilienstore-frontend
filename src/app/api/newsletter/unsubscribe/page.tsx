import type { Metadata } from "next";

import {
  noindexRobots,
  normalizeDescription,
  resolveOgImageUrl,
  toCanonicalUrl,
} from "../../../../lib/seo";
import { buildBackendUrl } from "../../../../lib/server/auth-session";

type SearchParams = Record<string, string | string[] | undefined>;

type UnsubscribePageProps = {
  searchParams?: Promise<SearchParams>;
};

type UnsubscribeResult = {
  ok: boolean;
  message: string;
  email: string;
};

const canonicalUrl = toCanonicalUrl("/api/newsletter/unsubscribe");

export const metadata: Metadata = {
  title: "Newsletter Unsubscribe",
  description: normalizeDescription("Unsubscribe email address from newsletter updates."),
  alternates: {
    canonical: canonicalUrl,
  },
  robots: noindexRobots,
  openGraph: {
    title: "Newsletter Unsubscribe",
    description: "Newsletter unsubscribe status",
    url: canonicalUrl,
    images: [{ url: resolveOgImageUrl() }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Newsletter Unsubscribe",
    description: "Newsletter unsubscribe status",
    images: [resolveOgImageUrl()],
  },
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

const getSearchParamValue = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

const getApiMessage = (payload: unknown, fallback: string) => {
  if (typeof payload === "string" && payload.trim()) {
    return payload.trim();
  }

  if (!payload || typeof payload !== "object") {
    return fallback;
  }

  const detail = (payload as { detail?: unknown }).detail;
  if (typeof detail === "string" && detail.trim()) {
    return detail.trim();
  }

  const parts = Object.entries(payload as Record<string, unknown>)
    .map(([field, value]) => {
      if (typeof value === "string" && value.trim()) {
        return `${field}: ${value.trim()}`;
      }

      if (Array.isArray(value)) {
        const firstText = value.find(
          (entry): entry is string => typeof entry === "string" && entry.trim().length > 0,
        );
        if (firstText) {
          return `${field}: ${firstText.trim()}`;
        }
      }

      return null;
    })
    .filter((value): value is string => Boolean(value));

  return parts[0] ?? fallback;
};

const readResponseMessage = async (response: Response, fallback: string) => {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const payload = await response.json().catch(() => null);
    return getApiMessage(payload, fallback);
  }

  const text = (await response.text().catch(() => "")).trim();
  return text || fallback;
};

const runUnsubscribe = async (email: string): Promise<UnsubscribeResult> => {
  if (!email) {
    return {
      ok: false,
      message: "Missing required query param: email.",
      email,
    };
  }

  const endpoint = buildBackendUrl("/api/newsletter/unsubscribe/");
  if (!endpoint) {
    return {
      ok: false,
      message: "API base URL is missing. Set API_BASE_URL or NEXT_PUBLIC_API_BASE_URL.",
      email,
    };
  }

  endpoint.searchParams.set("email", email);

  try {
    const response = await fetch(endpoint.toString(), {
      method: "GET",
      cache: "no-store",
    });

    const message = await readResponseMessage(
      response,
      response.ok
        ? "You have been unsubscribed from the newsletter."
        : "Failed to unsubscribe this email.",
    );

    return {
      ok: response.ok,
      message,
      email,
    };
  } catch {
    return {
      ok: false,
      message: "Could not reach the unsubscribe service. Please try again later.",
      email,
    };
  }
};

export default async function NewsletterUnsubscribePage({
  searchParams,
}: UnsubscribePageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const email = (getSearchParamValue(resolvedSearchParams?.email) ?? "").trim().toLowerCase();
  const result = await runUnsubscribe(email);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(205,198,183,0.3),_transparent_58%),_linear-gradient(160deg,_#f8f7f3_0%,_#fff_52%,_#f3efe8_100%)] px-4 py-12 text-slate-900">
      <section className="w-full max-w-xl rounded-[2rem] border border-black/10 bg-white/90 p-6 shadow-[0_30px_70px_-44px_rgba(0,0,0,0.55)] backdrop-blur sm:p-8">
        <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
          Newsletter Preferences
        </p>
        <h1 className="mt-2 font-display text-2xl leading-tight sm:text-[2rem]">
          {result.ok ? "Unsubscribe completed" : "Unsubscribe could not be completed"}
        </h1>
        <div
          className={`mt-5 rounded-2xl border px-4 py-3 text-sm leading-relaxed ${
            result.ok
              ? "border-emerald-500/30 bg-emerald-50 text-emerald-900"
              : "border-red-500/25 bg-red-50 text-red-900"
          }`}
        >
          {result.message}
        </div>
        <dl className="mt-5 space-y-2 text-sm">
          <div className="flex flex-wrap gap-x-2">
            <dt className="font-semibold text-slate-600">Email:</dt>
            <dd className="break-all text-slate-900">{result.email || "not provided"}</dd>
          </div>
        </dl>
      </section>
    </main>
  );
}
