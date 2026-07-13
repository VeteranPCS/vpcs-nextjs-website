import type { Metadata } from "next";
import SearchBlog, { BLOG_SEARCH_PAGE_SIZE } from "@/components/SearchBlog/SearchBlog";
import { pageCount, paginateBlogs, searchBlogs } from "@/lib/blog/mdx";

type SearchParams = Promise<{ query?: string; page?: string }>;

export async function generateMetadata(
  props: { searchParams: SearchParams },
): Promise<Metadata> {
  const searchParams = await props.searchParams;
  const trimmedQuery = (searchParams?.query ?? '').trim();

  return {
    title: trimmedQuery
      ? `Search results for “${trimmedQuery}”`
      : 'Search VeteranPCS Guides',
    // Keep search results out of the index while letting crawlers follow the
    // result links. robots.txt no longer disallows /blog-search so this meta
    // tag is actually reachable.
    robots: { index: false, follow: true },
  };
}

// Invalid or out-of-range ?page values clamp into [1, totalPages] so the page
// never crashes or renders an empty slice.
function parsePage(raw: string | undefined, totalPages: number): number {
  const parsed = Number.parseInt(raw ?? '1', 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return Math.min(parsed, totalPages);
}

export default async function BlogSearchPage(props: { searchParams: SearchParams }) {
  const searchParams = await props.searchParams;
  const query = searchParams?.query || '';
  const rankedResults = await searchBlogs(query);
  const totalPages = pageCount(rankedResults.length, BLOG_SEARCH_PAGE_SIZE);
  const page = parsePage(searchParams?.page, totalPages);
  const results = paginateBlogs(rankedResults, page, BLOG_SEARCH_PAGE_SIZE);

  return (
    <SearchBlog
      results={results}
      totalResultCount={rankedResults.length}
      page={page}
      totalPages={totalPages}
      query={query}
    />
  );
}
