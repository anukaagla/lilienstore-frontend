import { Suspense } from "react";

import { HomePageSkeleton } from "../components/page-skeletons";
import ShowRoom from "../components/show-room";
import { fetchBlogPosts } from "../lib/blog";

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
