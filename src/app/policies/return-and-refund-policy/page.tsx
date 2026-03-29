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

const canonicalUrl = toCanonicalUrl("/policies/return-and-refund-policy");
const description = normalizeDescription(
  "Review Lilienstore return and refund conditions, eligibility, and support guidance."
);

export const metadata: Metadata = {
  title: "Return & Refund Policy",
  description,
  alternates: {
    canonical: canonicalUrl,
  },
  robots: indexableRobots,
  openGraph: {
    type: "article",
    title: "Return & Refund Policy",
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
    title: "Return & Refund Policy",
    description,
    images: [resolveOgImageUrl()],
  },
};

export default function ReturnAndRefundPolicyPage() {
  const breadcrumbSchema = buildBreadcrumbListSchema([
    { name: "Home", item: toCanonicalUrl("/") },
    { name: "Return & Refund Policy", item: canonicalUrl },
  ]);
  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Return & Refund Policy",
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
        title={{ EN: "Return & Refund Policy", KA: "დაბრუნება და ანაზღაურება" }}
        policyKey="return_and_refund_policy"
        fallbackText={{
          EN: "Return and refund policy is not available yet.",
          KA: "დაბრუნებისა და ანაზღაურების პოლიტიკა ჯერ მიუწვდომელია.",
        }}
      />
    </>
  );
}
