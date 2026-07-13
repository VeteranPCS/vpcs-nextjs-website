import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import BlogCard from '@/components/Blog/BlogCard/BlogCard';
import BlogLeadCtaBand from '@/components/Blog/BlogLeadCtaBand';
import PaginationNav from '@/components/common/PaginationNav';
import { toBlogCardData, type BlogCardCtaContext } from '@/lib/blog/cards';
import { BLOG_CATEGORY_PAGE_SIZE, getAllBlogs, pageCount, paginateBlogs } from '@/lib/blog/mdx';
import { buildPagedPath } from '@/lib/blog/pagination';
import { SITE_URL } from '@/lib/siteUrl';
import { buildBlogItemList, buildBreadcrumbList } from '@/lib/structured-data';

export const revalidate = 86400;

const ARCHIVE_TITLE = 'All Military PCS & VA Loan Guides';

const ARCHIVE_CARD_CTA: BlogCardCtaContext = {
  ctaId: 'blog_archive_card',
  ctaPosition: 'blog_archive_grid',
  pageType: 'blog_archive',
};

// Reject anything that isn't the canonical decimal form ("2", not "02" or "2.0"),
// so every valid page has exactly one URL. Param values are validated here
// because dynamicParams serves arbitrary strings on demand.
function parsePageParam(value: unknown): number | null {
  if (typeof value !== 'string' || !/^[0-9]+$/.test(value)) return null;
  const page = Number(value);
  if (!Number.isSafeInteger(page) || String(page) !== value) return null;
  return page;
}

export async function generateStaticParams() {
  const blogs = await getAllBlogs();
  const totalPages = pageCount(blogs.length, BLOG_CATEGORY_PAGE_SIZE);
  const params: Array<{ page: string }> = [];
  for (let page = 2; page <= totalPages; page += 1) {
    params.push({ page: String(page) });
  }
  return params;
}

export async function generateMetadata(
  props: { params: Promise<{ page: string }> },
): Promise<Metadata> {
  const { page: pageParam } = await props.params;
  const page = parsePageParam(pageParam);
  if (page === null || page < 2) return { title: 'Page not found' };

  return {
    metadataBase: new URL(SITE_URL),
    title: `${ARCHIVE_TITLE}, Page ${page}`,
    description: `Browse every VeteranPCS guide on PCS moves, military bases, VA loans, and military money, sorted newest first. Page ${page} of the full archive.`,
    alternates: {
      canonical: `${SITE_URL}/blog/page/${page}`,
    },
  };
}

export default async function Page(props: { params: Promise<{ page: string }> }) {
  const { page: pageParam } = await props.params;
  // Page 1 is /blog itself; permanent (308) redirect keeps one canonical URL.
  if (pageParam === '1') permanentRedirect('/blog');

  const page = parsePageParam(pageParam);
  if (page === null || page < 2) notFound();

  const blogs = await getAllBlogs();
  const totalPages = pageCount(blogs.length, BLOG_CATEGORY_PAGE_SIZE);
  if (page > totalPages) notFound();

  const pagePosts = paginateBlogs(blogs, page, BLOG_CATEGORY_PAGE_SIZE);
  const pageUrl = `${SITE_URL}/blog/page/${page}`;

  const breadcrumbJsonLd = buildBreadcrumbList([
    { name: 'Home', url: `${SITE_URL}/` },
    { name: 'Blog', url: `${SITE_URL}/blog` },
    { name: `Page ${page}`, url: pageUrl },
  ]);
  const itemListJsonLd = buildBlogItemList({
    url: pageUrl,
    name: `${ARCHIVE_TITLE}, Page ${page}`,
    items: pagePosts.map((post) => ({
      url: `${SITE_URL}/blog/${post.slug}`,
      name: post.title,
    })),
  });

  return (
    <>
      {/* Plain script tags (not next/script) so JSON-LD is server-rendered into
          the HTML for crawlers, matching the [state] page convention. */}
      <script
        id={`json-ld-blog-archive-breadcrumb-${page}`}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        id={`json-ld-blog-archive-itemlist-${page}`}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
      <main className="bg-white">
        <section className="border-b border-[#E5E7EB] px-5 py-10 md:py-14">
          <div className="container mx-auto">
            <nav className="mb-6 text-sm text-[#6C757D]" aria-label="Breadcrumb">
              <Link href="/" className="hover:text-[#292F6C] inline-flex items-center min-h-11">Home</Link>
              <span className="mx-2">/</span>
              <Link href="/blog" className="hover:text-[#292F6C] inline-flex items-center min-h-11">Blog</Link>
              <span className="mx-2">/</span>
              <span className="text-[#292F6C]">Page {page}</span>
            </nav>
            <h1 className="text-[#292F6C] text-[30px] font-bold md:text-[42px]">{ARCHIVE_TITLE}</h1>
            <p className="mt-4 max-w-3xl text-[#495057] roboto text-base leading-7">
              Every VeteranPCS guide, newest first. Page {page} of {totalPages}.
            </p>
          </div>
        </section>
        <section className="px-5 py-10">
          <div className="container mx-auto">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3 lg:grid-cols-4">
              {pagePosts.map((post) => (
                <BlogCard key={post.slug} data={toBlogCardData(post)} cta={ARCHIVE_CARD_CTA} />
              ))}
            </div>
            <PaginationNav
              currentPage={page}
              totalPages={totalPages}
              hrefFor={(p) => buildPagedPath('/blog', p)}
            />
          </div>
        </section>
        <BlogLeadCtaBand
          pageType="blog_archive"
          ctaPosition="blog_archive_cta_band"
          agentCtaId="blog_archive_find_agent"
          lenderCtaId="blog_archive_find_lender"
        />
      </main>
    </>
  );
}
