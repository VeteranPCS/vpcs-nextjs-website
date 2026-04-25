import SearchBlog from "@/components/SearchBlog/SearchBlog";
import { searchBlogs } from "@/lib/blog/mdx";

export default async function BlogSearchPage(props: { searchParams: Promise<{ query: string }> }) {
  const searchParams = await props.searchParams;
  const query = searchParams?.query || '';
  const searchedBlog = await searchBlogs(query);

  return <SearchBlog searchedBlog={searchedBlog} />;
}
