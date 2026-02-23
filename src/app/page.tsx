import ShowRoom from "../components/show-room";
import { fetchBlogPosts } from "../lib/blog";

export default async function Page() {
  const posts = await fetchBlogPosts();
  return <ShowRoom posts={posts} />;
}
