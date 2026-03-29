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

const canonicalUrl = toCanonicalUrl("/policies/shipping-and-delivery-policy");
const description = normalizeDescription(
  "Read Lilienstore shipping and delivery terms, including timelines and order fulfillment details."
);

export const metadata: Metadata = {
  title: "Shipping & Delivery Policy",
  description,
  alternates: {
    canonical: canonicalUrl,
  },
  robots: indexableRobots,
  openGraph: {
    type: "article",
    title: "Shipping & Delivery Policy",
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
    title: "Shipping & Delivery Policy",
    description,
    images: [resolveOgImageUrl()],
  },
};

export default function ShippingAndDeliveryPolicyPage() {
  const breadcrumbSchema = buildBreadcrumbListSchema([
    { name: "Home", item: toCanonicalUrl("/") },
    { name: "Shipping & Delivery Policy", item: canonicalUrl },
  ]);
  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Shipping & Delivery Policy",
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
        title={{ EN: "Shipping & Delivery Policy", KA: "მიწოდების პოლიტიკა" }}
        policyKey="shipping_and_delivery_policy"
        fallbackText={{
          EN: "Shipping and delivery policy is not available yet.",
          KA: "მიწოდების პოლიტიკა ჯერ მიუწვდომელია.",
        }}
      />
    </>
  );
}
