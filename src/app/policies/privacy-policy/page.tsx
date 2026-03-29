import type { Metadata } from "next";

import PolicyPage from "../../../components/policy-page";
import {
  buildBreadcrumbListSchema,
  indexableRobots,
  jsonLdStringify,
  normalizeDescription,
  resolveOgImageUrl,
  toCanonicalUrl,
} from "../../../lib/seo";

const canonicalUrl = toCanonicalUrl("/policies/privacy-policy");
const description = normalizeDescription(
  "Read Lilienstore's privacy policy to understand how personal data is collected and processed."
);

export const metadata: Metadata = {
  title: "Privacy Policy",
  description,
  alternates: {
    canonical: canonicalUrl,
  },
  robots: indexableRobots,
  openGraph: {
    type: "article",
    title: "Privacy Policy",
    description,
    url: canonicalUrl,
    images: [
      {
        url: resolveOgImageUrl(),
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Privacy Policy",
    description,
    images: [resolveOgImageUrl()],
  },
};

export default function PrivacyPolicyPage() {
  const breadcrumbSchema = buildBreadcrumbListSchema([
    { name: "Home", item: toCanonicalUrl("/") },
    { name: "Privacy Policy", item: canonicalUrl },
  ]);
  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Privacy Policy",
    description,
    url: canonicalUrl,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdStringify([breadcrumbSchema, webPageSchema]),
        }}
      />
      <PolicyPage
        title={{ EN: "Privacy Policy", KA: "კონფიდენციალურობის პოლიტიკა" }}
        policyKey="privacy_policy"
        fallbackText={{
          EN: "Privacy policy is not available yet.",
          KA: "კონფიდენციალურობის პოლიტიკა ჯერ მიუწვდომელია.",
        }}
      />
    </>
  );
}
