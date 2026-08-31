import type { Metadata } from "next";
import "./globals.css";
import { BrandProvider } from "../components/brand-provider";
import { WEBSITE_NAME } from "../lib/site-config";
import { fetchBrand } from "../lib/brand";
import { readText } from "../lib/localized";
import {
  buildOrganizationSchema,
  buildWebSiteSchema,
  DEFAULT_SEO_DESCRIPTION,
  indexableRobots,
  jsonLdStringify,
  metadataBase,
  resolveOgImageUrl,
  toCanonicalUrl,
} from "../lib/seo";

const GOOGLE_SITE_VERIFICATION =
  process.env.GOOGLE_SITE_VERIFICATION?.trim() ||
  process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?.trim() ||
  undefined;

export const metadata: Metadata = {
  metadataBase,
  title: {
    default: WEBSITE_NAME,
    template: `%s | ${WEBSITE_NAME}`,
  },
  description: DEFAULT_SEO_DESCRIPTION,
  alternates: {
    canonical: toCanonicalUrl("/"),
  },
  robots: indexableRobots,
  openGraph: {
    type: "website",
    siteName: WEBSITE_NAME,
    locale: "en_US",
    title: WEBSITE_NAME,
    description: DEFAULT_SEO_DESCRIPTION,
    url: toCanonicalUrl("/"),
    images: [
      {
        url: resolveOgImageUrl(),
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: WEBSITE_NAME,
    description: DEFAULT_SEO_DESCRIPTION,
    images: [resolveOgImageUrl()],
  },
  verification: GOOGLE_SITE_VERIFICATION
    ? { google: GOOGLE_SITE_VERIFICATION }
    : undefined,
};

const toSocialUrl = (
  value: string,
  platform: "instagram" | "facebook" | "tiktok",
) => {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  const cleaned = trimmed.replace(/^@/, "");
  if (platform === "instagram") return `https://www.instagram.com/${cleaned}`;
  if (platform === "facebook") return `https://www.facebook.com/${cleaned}`;
  return `https://www.tiktok.com/@${cleaned}`;
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const brand = await fetchBrand();
  const brandName = readText(brand?.brand_name, WEBSITE_NAME);
  const brandDescription = readText(brand?.description, "");
  const brandAddress = readText(brand?.address, "");
  const brandLogo = (brand?.logo_url ?? brand?.logo ?? "").trim();
  const socialUrls = [
    toSocialUrl(brand?.instagram_url ?? "", "instagram"),
    toSocialUrl(brand?.facebook_url ?? "", "facebook"),
    toSocialUrl(brand?.tiktok_url ?? "", "tiktok"),
  ].filter((value) => Boolean(value));

  const organizationSchema = buildOrganizationSchema({
    name: brandName,
    description: brandDescription || undefined,
    logoUrl: brandLogo ? resolveOgImageUrl(brandLogo) : undefined,
    email: brand?.email?.trim() || undefined,
    phone: brand?.phone_number?.trim() || undefined,
    address: brandAddress || undefined,
    sameAs: socialUrls.length ? socialUrls : undefined,
  });

  const schemaGraph = [buildWebSiteSchema(), organizationSchema];

  return (
    <html lang="en">
      <body className="antialiased" suppressHydrationWarning>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdStringify(schemaGraph) }}
        />
        <BrandProvider initialBrand={brand}>{children}</BrandProvider>
      </body>
    </html>
  );
}
