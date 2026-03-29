import { Suspense } from "react";
import type { Metadata } from "next";

import { ProfilePageSkeleton } from "../../components/page-skeletons";
import Profile from "../../components/profile";
import {
  noindexRobots,
  normalizeDescription,
  resolveOgImageUrl,
  toCanonicalUrl,
} from "../../lib/seo";

const canonicalUrl = toCanonicalUrl("/profile");

export const metadata: Metadata = {
  title: "My Account",
  description: normalizeDescription(
    "Manage your account profile, saved information, and recent activity."
  ),
  alternates: {
    canonical: canonicalUrl,
  },
  robots: noindexRobots,
  openGraph: {
    title: "My Account",
    description: "Account area",
    url: canonicalUrl,
    images: [
      {
        url: resolveOgImageUrl(),
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "My Account",
    description: "Account area",
    images: [resolveOgImageUrl()],
  },
};

export default function ProfilePage() {
  return (
    <Suspense fallback={<ProfilePageSkeleton />}>
      <Profile />
    </Suspense>
  );
}
