import { Suspense } from "react";
import type { Metadata } from "next";

import { HomePageSkeleton } from "../components/page-skeletons";
import ShowRoom from "../components/show-room";
import { fetchBlogPosts } from "../lib/blog";
import {
  indexableRobots,
  normalizeDescription,
  resolveOgImageUrl,
  toCanonicalUrl,
} from "../lib/seo";

const canonicalUrl = toCanonicalUrl("/");
const description = normalizeDescription(
  "Lilienstore is a contemporary fashion showroom featuring curated silhouettes, premium materials, and limited collections."
);

export const metadata: Metadata = {
  title: {
    absolute: "Lilienstore",
  },
  description,
  alternates: {
    canonical: canonicalUrl,
  },
  robots: indexableRobots,
  openGraph: {
    type: "website",
    title: "Lilienstore",
    description,
    url: canonicalUrl,
    images: [
      {
        url: resolveOgImageUrl("/images/main-pic.png"),
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Lilienstore",
    description,
    images: [resolveOgImageUrl("/images/main-pic.png")],
  },
};

async function ShowRoomContent() {
  const posts = await fetchBlogPosts();
  return <ShowRoom posts={posts} />;
}

export default function Page() {
  return (
    <Suspense fallback={<HomePageSkeleton />}>
      <ShowRoomContent />
    </Suspense>
  );
}
