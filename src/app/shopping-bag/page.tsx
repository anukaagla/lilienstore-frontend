import type { Metadata } from "next";

import ShoppingBag from "../../components/shopping-bag";
import {
  noindexRobots,
  normalizeDescription,
  resolveOgImageUrl,
  toCanonicalUrl,
} from "../../lib/seo";

const canonicalUrl = toCanonicalUrl("/shopping-bag");

export const metadata: Metadata = {
  title: "Shopping Bag",
  description: normalizeDescription("Review products currently in your shopping bag."),
  alternates: {
    canonical: canonicalUrl,
  },
  robots: noindexRobots,
  openGraph: {
    title: "Shopping Bag",
    description: "Shopping bag",
    url: canonicalUrl,
    images: [
      {
        url: resolveOgImageUrl(),
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Shopping Bag",
    description: "Shopping bag",
    images: [resolveOgImageUrl()],
  },
};

export default function ShoppingBagPage() {
  return <ShoppingBag />;
}
