import BlogCard from "@/components/Blog/BlogCard/BlogCard";
import PaginationNav from "@/components/common/PaginationNav";
import { toBlogCardData, type BlogCardCtaContext } from "@/lib/blog/cards";
import type { BlogPost } from "@/lib/blog/types";
import { BLOG_COMPONENTS } from "@/lib/blog/components";
import BlogSearchForm from "@/components/BlogPage/BlogSearchForm";
import { BlogSearchTracker } from "@/components/Analytics/Trackers";
import TrackedCtaLink from "@/components/common/TrackedCtaLink";

export const BLOG_SEARCH_PAGE_SIZE = 10;

const SEARCH_RESULT_CTA: BlogCardCtaContext = {
  ctaId: 'blog_search_result_card',
  ctaPosition: 'blog_search_results',
  pageType: 'blog_search',
  ctaLocation: 'blog_search_results',
};

// Page 1 is the bare query URL; deeper pages add &page=N. URLSearchParams
// handles encoding the raw query value.
function searchHrefFor(query: string, page: number): string {
  const params = new URLSearchParams();
  if (query.trim()) params.set('query', query);
  if (page > 1) params.set('page', String(page));
  const qs = params.toString();
  return qs ? `/blog-search?${qs}` : '/blog-search';
}

type Props = {
  // Current page slice of the ranked results.
  results: BlogPost[];
  // Total ranked result count across all pages (drives heading + analytics).
  totalResultCount: number;
  page: number;
  totalPages: number;
  query: string;
};

export default function SearchBlog({ results, totalResultCount, page, totalPages, query }: Props) {
  const trimmedQuery = query.trim();

  if (totalResultCount === 0) {
    return (
      <div className="container mx-auto my-16 px-5">
        <BlogSearchTracker query={query} totalResultCount={0} page={page} />
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-[#292F6C] text-[30px] font-bold md:text-[42px]">
            No results{trimmedQuery ? ` for "${trimmedQuery}"` : ''}
          </h1>
          <div className="mx-auto mt-6 max-w-md">
            <BlogSearchForm id="blog-empty-search-query" defaultQuery={query} />
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <TrackedCtaLink
              href="/blog"
              className="text-[#292F6C] font-bold"
              cta={{
                ctaId: 'blog_search_no_results_all_guides',
                ctaIntent: 'content_navigation',
                ctaPosition: 'blog_search_no_results',
                ctaComponent: 'blog_search',
                ctaLabel: 'Back to all guides',
                destination: '/blog',
                pageType: 'blog_search',
              }}
            >Back to all guides</TrackedCtaLink>
            {BLOG_COMPONENTS.slice(0, 3).map((component) => (
              <TrackedCtaLink
                key={component.slug}
                href={`/blog/category/${component.slug}`}
                className="text-[#292F6C] underline"
                cta={{
                  ctaId: 'blog_search_no_results_category',
                  ctaIntent: 'content_navigation',
                  ctaPosition: 'blog_search_no_results',
                  ctaComponent: 'blog_search',
                  ctaLabel: component.label,
                  destination: `/blog/category/${component.slug}`,
                  pageType: 'blog_search',
                  contentType: 'blog_category',
                }}
              >
                {component.label}
              </TrackedCtaLink>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto md:mt-36 sm:mt-5 mt-5 px-5">
      <BlogSearchTracker query={query} totalResultCount={totalResultCount} page={page} />
      <div className="max-w-3xl">
        <h1 className="text-[#292F6C] text-[30px] font-bold md:text-[42px]">
          {totalResultCount} result{totalResultCount === 1 ? '' : 's'}
          {trimmedQuery ? ` for "${trimmedQuery}"` : ''}
        </h1>
        {totalPages > 1 ? (
          <p className="mt-2 text-[#6C757D] text-[16px]">
            Page {page} of {totalPages}
          </p>
        ) : null}
        <TrackedCtaLink
          href="/blog"
          className="mt-4 inline-block text-[#292F6C] font-bold"
          cta={{
            ctaId: 'blog_search_results_all_guides',
            ctaIntent: 'content_navigation',
            ctaPosition: 'blog_search_results_header',
            ctaComponent: 'blog_search',
            ctaLabel: 'Back to all guides',
            destination: '/blog',
            pageType: 'blog_search',
          }}
        >
          Back to all guides
        </TrackedCtaLink>
      </div>
      <div className="flex flex-wrap justify-start gap-10 my-10">
        <div className="lg:w-3/5 sm:w-full w-full xl:mr-14 lg:mr-5 md:mr-10">
          {results.map((blog) => (
            <div
              key={blog.slug}
              className="my-10 overflow-hidden rounded-custom border border-[#E2E4E5]"
            >
              <BlogCard
                data={toBlogCardData(blog)}
                variant="horizontal"
                cta={SEARCH_RESULT_CTA}
              />
            </div>
          ))}
          <PaginationNav
            currentPage={page}
            totalPages={totalPages}
            hrefFor={(p) => searchHrefFor(query, p)}
          />
        </div>
        <div className="lg:w-1/5 sm:w-full w-full">
          <aside className="w-full max-w-xs p-6 md:border-l border-b-0 sticky top-16 right-0 bg-white">
            <BlogSearchForm id="blog-results-search-query" className="mb-8" defaultQuery={query} />
          </aside>
        </div>
      </div>
    </div>
  );
}
