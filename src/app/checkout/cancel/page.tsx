import type { Metadata } from "next";

import PaymentCancel from "../../../components/payment-cancel";
import {
  noindexRobots,
  normalizeDescription,
  resolveOgImageUrl,
  toCanonicalUrl,
} from "../../../lib/seo";

const canonicalUrl = toCanonicalUrl("/checkout/cancel");

export const metadata: Metadata = {
  title: "Payment Cancelled",
  description: normalizeDescription("Payment cancellation details."),
  alternates: {
    canonical: canonicalUrl,
  },
  robots: noindexRobots,
  openGraph: {
    title: "Payment Cancelled",
    description: "Payment cancellation",
    url: canonicalUrl,
    images: [
      {
        url: resolveOgImageUrl(),
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Payment Cancelled",
    description: "Payment cancellation",
    images: [resolveOgImageUrl()],
  },
};

export default function CheckoutCancelPage() {
  return <PaymentCancel />;
}
