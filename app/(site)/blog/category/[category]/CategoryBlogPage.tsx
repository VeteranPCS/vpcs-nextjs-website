import Link from 'next/link';
import { notFound } from 'next/navigation';
import BlogCard from '@/components/Blog/BlogCard/BlogCard';
import BlogLeadCtaBand from '@/components/Blog/BlogLeadCtaBand';
import BlogSearchForm from '@/components/BlogPage/BlogSearchForm';
import PaginationNav from '@/components/common/PaginationNav';
import TrackedCtaLink from '@/components/common/TrackedCtaLink';
import blogComponentsData from '@/content/_data/blog-components.json';
import pillars from '@/content/_data/blog-pillars.json';
import { toBlogCardData, type BlogCardCtaContext } from '@/lib/blog/cards';
import { BLOG_COMPONENTS, getBlogComponentBySlug } from '@/lib/blog/components';
import { BLOG_CATEGORY_PAGE_SIZE, getBlogsByComponentSlug, pageCount, paginateBlogs } from '@/lib/blog/mdx';
import { buildPagedPath } from '@/lib/blog/pagination';
import { SITE_URL } from '@/lib/siteUrl';
import { buildBlogItemList, buildBreadcrumbList, buildCollectionPage } from '@/lib/structured-data';

type Props = {
  category: string;
  page?: number;
};

// Lender-leaning categories get a "Find a Lender" header CTA (label from ctaCopy).
const LENDER_CATEGORY_SLUGS = new Set(['va-loan-help', 'financial-guidance']);

const PILLAR_BY_COMPONENT = pillars.byComponent as Record<string, string | undefined>;

// Page-1 intro copy lives in blog-components.json; the BlogComponent type in
// lib/blog/components.ts (foundation, not owned here) doesn't expose it yet.
const INTRO_BY_SLUG: ReadonlyMap<string, string> = new Map(
  blogComponentsData.map((entry) => [entry.slug, entry.intro]),
);

const GRID_CARD_CTA: BlogCardCtaContext = {
  ctaId: 'blog_category_card',
  // Existing hub grid cards fired with this position (via BlogMovingPcsingPost);
  // kept for continuity of the cta_position distribution.
  ctaPosition: 'blog_article_grid',
  pageType: 'blog_category',
};

const PILLAR_CARD_CTA: BlogCardCtaContext = {
  ctaId: 'blog_category_pillar',
  ctaPosition: 'blog_category_pillar',
  pageType: 'blog_category',
};

export async function CategoryBlogPage({ category, page = 1 }: Props) {
  const component = getBlogComponentBySlug(category);
  if (!component) notFound();

  const posts = await getBlogsByComponentSlug(category);
  if (posts.length === 0) notFound();

  const totalPages = pageCount(posts.length, BLOG_CATEGORY_PAGE_SIZE);
  if (page < 1) notFound();
  if (page > totalPages) notFound();

  const pagePosts = paginateBlogs(posts, page, BLOG_CATEGORY_PAGE_SIZE);

  // Page-1 pinned pillar: editorial pick from blog-pillars.json, newest post as
  // fallback. Resolved on every page (not just page 1) so the pinned post is
  // filtered out of whichever page holds its natural chronological slot, or it
  // would render twice in the category archive.
  const pillarSlug = PILLAR_BY_COMPONENT[category];
  // posts[0] is safe: posts.length === 0 already routed to notFound() above.
  const pillar = posts.find((post) => post.slug === pillarSlug) ?? posts[0]!;
  const pillarPost = page === 1 ? pillar : undefined;
  const gridPosts = pagePosts.filter((post) => post.slug !== pillar.slug);

  const intro = INTRO_BY_SLUG.get(category) || component.description;
  const isLenderCategory = LENDER_CATEGORY_SLUGS.has(category);
  const ctaLabel = component.ctaCopy ?? (isLenderCategory ? 'Find a Lender' : 'Find an Agent');

  const hubPath = `/blog/category/${category}`;
  const pageUrl = `${SITE_URL}${buildPagedPath(hubPath, page)}`;
  const pageName = page > 1 ? `${component.label} Guides, Page ${page}` : `${component.label} Guides`;
  const listedPosts = pillarPost && page === 1 ? [pillarPost, ...gridPosts] : gridPosts;

  const breadcrumbJsonLd = buildBreadcrumbList([
    { name: 'Home', url: `${SITE_URL}/` },
    { name: 'Blog', url: `${SITE_URL}/blog` },
    { name: component.label, url: `${SITE_URL}${hubPath}` },
  ]);
  const collectionJsonLd = buildCollectionPage({
    url: pageUrl,
    name: pageName,
    description: component.description,
    itemList: buildBlogItemList({
      url: pageUrl,
      name: pageName,
      items: listedPosts.map((post) => ({
        url: `${SITE_URL}/blog/${post.slug}`,
        name: post.title,
      })),
    }),
  });

  return (
    <>
      {/* Plain script tags (not next/script) so JSON-LD is server-rendered into
          the HTML for crawlers, matching the [state] page convention. */}
      <script
        id={`json-ld-category-${category}-${page}`}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        id={`json-ld-category-collection-${category}-${page}`}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }}
      />
      <main className="bg-white">
        <section className="border-b border-[#E5E7EB] px-5 py-10 md:py-14">
          <div className="container mx-auto">
            <nav className="mb-6 text-sm text-[#6C757D]" aria-label="Breadcrumb">
              <Link href="/" className="hover:text-[#292F6C] inline-flex items-center min-h-11">Home</Link>
              <span className="mx-2">/</span>
              <Link href="/blog" className="hover:text-[#292F6C] inline-flex items-center min-h-11">Blog</Link>
              <span className="mx-2">/</span>
              <span className="text-[#292F6C]">{component.label}</span>
            </nav>
            <div className="grid gap-6 md:grid-cols-[1fr_320px] md:items-end">
              <div>
                <h1 className="text-[#292F6C] text-[30px] font-bold md:text-[42px]">
                  {component.label}
                </h1>
                <p className="mt-4 max-w-3xl text-[#495057] roboto text-base leading-7">
                  {page === 1 ? intro : component.description}
                </p>
              </div>
              <BlogSearchForm id={`blog-category-${category}-search-query`} />
            </div>
          </div>
        </section>
        <section className="px-5 py-10">
          <div className="container mx-auto">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <p className="text-[#6C757D] roboto text-sm">
                {posts.length} guides{totalPages > 1 ? `, page ${page} of ${totalPages}` : ''}
              </p>
              {isLenderCategory ? (
                <TrackedCtaLink
                  href="/contact-lender"
                  className="rounded-custom bg-[#a81f23] px-5 py-3 text-sm font-bold text-white"
                  cta={{
                    ctaId: 'blog_category_find_lender',
                    ctaIntent: 'contact_lender',
                    ctaPosition: 'blog_category_header',
                    ctaComponent: 'blog_category_page',
                    ctaLabel: ctaLabel,
                    destination: '/contact-lender',
                    pageType: 'blog_category',
                    contentType: 'blog_category',
                    partnerType: 'lender',
                  }}
                >
                  {ctaLabel}
                </TrackedCtaLink>
              ) : (
                <TrackedCtaLink
                  href="/contact-agent"
                  className="rounded-custom bg-[#a81f23] px-5 py-3 text-sm font-bold text-white"
                  cta={{
                    ctaId: 'blog_category_find_agent',
                    ctaIntent: 'contact_agent',
                    ctaPosition: 'blog_category_header',
                    ctaComponent: 'blog_category_page',
                    ctaLabel: ctaLabel,
                    destination: '/contact-agent',
                    pageType: 'blog_category',
                    contentType: 'blog_category',
                    partnerType: 'agent',
                  }}
                >
                  {ctaLabel}
                </TrackedCtaLink>
              )}
            </div>
            {pillarPost ? (
              <div className="mb-8 overflow-hidden rounded-custom border border-[#E5E7EB]">
                <BlogCard data={toBlogCardData(pillarPost)} variant="horizontal" cta={PILLAR_CARD_CTA} />
              </div>
            ) : null}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3 lg:grid-cols-4">
              {gridPosts.map((post) => (
                <BlogCard key={post.slug} data={toBlogCardData(post)} cta={GRID_CARD_CTA} />
              ))}
            </div>
            <PaginationNav
              currentPage={page}
              totalPages={totalPages}
              hrefFor={(p) => buildPagedPath(hubPath, p)}
            />
          </div>
        </section>
        <BlogLeadCtaBand
          pageType="blog_category"
          ctaPosition="blog_category_cta_band"
          agentCtaId="blog_category_find_agent"
          lenderCtaId="blog_category_find_lender"
        />
      </main>
    </>
  );
}

export async function categoryStaticParams() {
  return BLOG_COMPONENTS.map((component) => ({ category: component.slug }));
}
