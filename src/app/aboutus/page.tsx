import type { Metadata } from "next";

import AboutUs from "../../components/aboutus";
import {
  buildBreadcrumbListSchema,
  indexableRobots,
  jsonLdStringify,
  normalizeDescription,
  resolveOgImageUrl,
  toCanonicalUrl,
} from "../../lib/seo";

const canonicalUrl = toCanonicalUrl("/aboutus");
const description = normalizeDescription(
  "Learn about Lilienstore, our design philosophy, and the craftsmanship behind each contemporary fashion piece."
);

export const metadata: Metadata = {
  title: "About Us",
  description,
  alternates: {
    canonical: canonicalUrl,
  },
  robots: indexableRobots,
  openGraph: {
    type: "website",
    title: "About Us",
    description,
    url: canonicalUrl,
    images: [
      {
        url: resolveOgImageUrl("/images/aboutus1.png"),
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "About Us",
    description,
    images: [resolveOgImageUrl("/images/aboutus1.png")],
  },
};

export default function AboutUsPage() {
  const breadcrumbSchema = buildBreadcrumbListSchema([
    { name: "Home", item: toCanonicalUrl("/") },
    { name: "About Us", item: canonicalUrl },
  ]);

  const aboutPageSchema = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: "About Us",
    description,
    url: canonicalUrl,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdStringify([breadcrumbSchema, aboutPageSchema]),
        }}
      />
      <AboutUs />
    </>
  );
}
