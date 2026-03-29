import type { Metadata } from "next";

import { WEBSITE_NAME } from "./site-config";

const FALLBACK_SITE_ORIGIN = "https://lilienstore.com";
const MAX_DESCRIPTION_LENGTH = 160;

export const DEFAULT_OG_IMAGE_PATH = "/images/link-pic2.JPG.jpeg";
export const DEFAULT_SEO_DESCRIPTION =
  "Shop curated contemporary fashion from Lilienstore, with elegant silhouettes, premium fabrics, and limited collections.";

const normalizeSiteOrigin = (value?: string) => {
  const trimmed = value?.trim();
  if (!trimmed) {
    return FALLBACK_SITE_ORIGIN;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return FALLBACK_SITE_ORIGIN;
    }

    return parsed.origin;
  } catch {
    return FALLBACK_SITE_ORIGIN;
  }
};

export const SITE_ORIGIN = normalizeSiteOrigin(process.env.NEXT_PUBLIC_SITE_URL);

export const metadataBase = new URL(SITE_ORIGIN);

export const absoluteUrl = (path: string) => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return new URL(normalizedPath, SITE_ORIGIN).toString();
};

export const normalizeDescription = (
  value: string | null | undefined,
  fallback = DEFAULT_SEO_DESCRIPTION,
) => {
  const compact = value?.replace(/\s+/g, " ").trim();
  if (!compact) {
    return fallback;
  }

  if (compact.length <= MAX_DESCRIPTION_LENGTH) {
    return compact;
  }

  return `${compact.slice(0, MAX_DESCRIPTION_LENGTH - 1).trimEnd()}…`;
};

export const buildSeoTitle = (title: string) => {
  const trimmed = title.trim();
  return trimmed ? `${trimmed} | ${WEBSITE_NAME}` : WEBSITE_NAME;
};

export const resolveOgImageUrl = (image?: string | null) => {
  const trimmed = image?.trim();
  if (!trimmed) {
    return absoluteUrl(DEFAULT_OG_IMAGE_PATH);
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return absoluteUrl(trimmed);
};

export const toCanonicalUrl = (
  pathname: string,
  query?: Record<string, string | undefined>,
) => {
  const url = new URL(pathname, SITE_ORIGIN);

  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      const trimmed = value?.trim();
      if (!trimmed) {
        return;
      }
      url.searchParams.set(key, trimmed);
    });
  }

  return url.toString();
};

export const indexableRobots: NonNullable<Metadata["robots"]> = {
  index: true,
  follow: true,
  googleBot: {
    index: true,
    follow: true,
    "max-image-preview": "large",
    "max-video-preview": -1,
    "max-snippet": -1,
  },
};

export const noindexRobots: NonNullable<Metadata["robots"]> = {
  index: false,
  follow: true,
  googleBot: {
    index: false,
    follow: true,
    "max-image-preview": "large",
    "max-video-preview": -1,
    "max-snippet": -1,
  },
};

export type JsonLdBreadcrumb = {
  name: string;
  item: string;
};

export const buildBreadcrumbListSchema = (items: JsonLdBreadcrumb[]) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map((entry, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: entry.name,
    item: entry.item,
  })),
});

export const buildWebSiteSchema = () => ({
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: WEBSITE_NAME,
  url: SITE_ORIGIN,
  potentialAction: {
    "@type": "SearchAction",
    target: `${SITE_ORIGIN}/market?q={search_term_string}`,
    "query-input": "required name=search_term_string",
  },
});

type OrganizationSchemaOptions = {
  name: string;
  description?: string;
  logoUrl?: string;
  email?: string;
  phone?: string;
  address?: string;
  sameAs?: string[];
};

export const buildOrganizationSchema = ({
  name,
  description,
  logoUrl,
  email,
  phone,
  address,
  sameAs,
}: OrganizationSchemaOptions) => ({
  "@context": "https://schema.org",
  "@type": "Organization",
  name,
  url: SITE_ORIGIN,
  ...(description ? { description } : {}),
  ...(logoUrl ? { logo: logoUrl } : {}),
  ...(email ? { email } : {}),
  ...(phone ? { telephone: phone } : {}),
  ...(address
    ? {
        address: {
          "@type": "PostalAddress",
          streetAddress: address,
        },
      }
    : {}),
  ...(sameAs && sameAs.length ? { sameAs } : {}),
});

export const jsonLdStringify = (payload: unknown) =>
  JSON.stringify(payload)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
