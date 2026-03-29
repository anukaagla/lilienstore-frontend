import type { Metadata } from "next";

import ContactUs from "../../components/contactus";
import {
  buildBreadcrumbListSchema,
  indexableRobots,
  jsonLdStringify,
  normalizeDescription,
  resolveOgImageUrl,
  toCanonicalUrl,
} from "../../lib/seo";

const canonicalUrl = toCanonicalUrl("/contactus");
const description = normalizeDescription(
  "Contact Lilienstore for order support, product questions, and customer service."
);

export const metadata: Metadata = {
  title: "Contact Us",
  description,
  alternates: {
    canonical: canonicalUrl,
  },
  robots: indexableRobots,
  openGraph: {
    type: "website",
    title: "Contact Us",
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
    title: "Contact Us",
    description,
    images: [resolveOgImageUrl()],
  },
};

export default function ContactUsPage() {
  const breadcrumbSchema = buildBreadcrumbListSchema([
    { name: "Home", item: toCanonicalUrl("/") },
    { name: "Contact Us", item: canonicalUrl },
  ]);

  const contactPageSchema = {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    name: "Contact Us",
    description,
    url: canonicalUrl,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdStringify([breadcrumbSchema, contactPageSchema]),
        }}
      />
      <ContactUs />
    </>
  );
}
