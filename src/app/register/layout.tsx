import type { Metadata } from "next";

import {
  noindexRobots,
  normalizeDescription,
  resolveOgImageUrl,
  toCanonicalUrl,
} from "../../lib/seo";

const canonicalUrl = toCanonicalUrl("/register");

export const metadata: Metadata = {
  title: "Register",
  description: normalizeDescription("Create an account to manage orders and checkout faster."),
  alternates: {
    canonical: canonicalUrl,
  },
  robots: noindexRobots,
  openGraph: {
    title: "Register",
    description: "Account registration",
    url: canonicalUrl,
    images: [
      {
        url: resolveOgImageUrl(),
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Register",
    description: "Account registration",
    images: [resolveOgImageUrl()],
  },
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
