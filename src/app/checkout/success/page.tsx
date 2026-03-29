import type { Metadata } from "next";

import PaymentSuccess from "../../../components/payment-success";
import {
  noindexRobots,
  normalizeDescription,
  resolveOgImageUrl,
  toCanonicalUrl,
} from "../../../lib/seo";

const canonicalUrl = toCanonicalUrl("/checkout/success");

export const metadata: Metadata = {
  title: "Order Success",
  description: normalizeDescription("Order confirmation details."),
  alternates: {
    canonical: canonicalUrl,
  },
  robots: noindexRobots,
  openGraph: {
    title: "Order Success",
    description: "Order confirmation",
    url: canonicalUrl,
    images: [
      {
        url: resolveOgImageUrl(),
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Order Success",
    description: "Order confirmation",
    images: [resolveOgImageUrl()],
  },
};

export default function CheckoutSuccessPage() {
  return <PaymentSuccess />;
}
