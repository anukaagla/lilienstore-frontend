import type { Metadata } from "next";

import {
  noindexRobots,
  normalizeDescription,
  resolveOgImageUrl,
  toCanonicalUrl,
} from "../../lib/seo";

const canonicalUrl = toCanonicalUrl("/reset-password");

export const metadata: Metadata = {
  title: "Reset Password",
  description: normalizeDescription("Reset your account password securely."),
  alternates: {
    canonical: canonicalUrl,
  },
  robots: noindexRobots,
  openGraph: {
    title: "Reset Password",
    description: "Password reset",
    url: canonicalUrl,
    images: [
      {
        url: resolveOgImageUrl(),
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Reset Password",
    description: "Password reset",
    images: [resolveOgImageUrl()],
  },
};

export default function ResetPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
