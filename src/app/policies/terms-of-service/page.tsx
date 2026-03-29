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

const canonicalUrl = toCanonicalUrl("/policies/terms-of-service");
const description = normalizeDescription(
  "Review Lilienstore terms and conditions for purchases, services, and website usage."
);

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description,
  alternates: {
    canonical: canonicalUrl,
  },
  robots: indexableRobots,
  openGraph: {
    type: "article",
    title: "Terms & Conditions",
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
    title: "Terms & Conditions",
    description,
    images: [resolveOgImageUrl()],
  },
};

export default function TermsOfServicePage() {
  const breadcrumbSchema = buildBreadcrumbListSchema([
    { name: "Home", item: toCanonicalUrl("/") },
    { name: "Terms & Conditions", item: canonicalUrl },
  ]);
  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Terms & Conditions",
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
        title={{ EN: "Terms & Conditions", KA: "წესები და პირობები" }}
        policyKey="terms_of_service"
        fallbackText={{
          EN: "Terms and conditions are not available yet.",
          KA: "წესები და პირობები ჯერ მიუწვდომელია.",
        }}
      />
    </>
  );
}
