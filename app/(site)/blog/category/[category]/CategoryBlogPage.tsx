import Script from 'next/script';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import BlogMovingPcsingPost from '@/components/BlogPage/BlogPage/BlogMovingPcsingBlogPostSection/BlogMovingPcsingPost';
import BlogSearchForm from '@/components/BlogPage/BlogSearchForm';
import { BLOG_COMPONENTS, getBlogComponentBySlug } from '@/lib/blog/components';
import { BLOG_CATEGORY_PAGE_SIZE, getBlogsByComponentSlug, pageCount, paginateBlogs } from '@/lib/blog/mdx';
import { SITE_URL } from '@/lib/siteUrl';
import { buildBreadcrumbList } from '@/lib/structured-data';
import TrackedCtaLink from '@/components/common/TrackedCtaLink';

type Props = {
  category: string;
  page?: number;
};

export async function CategoryBlogPage({ category, page = 1 }: Props) {
  const component = getBlogComponentBySlug(category);
  if (!component) notFound();
  if (page === 1 && page.toString() !== '1') notFound();

  const posts = await getBlogsByComponentSlug(category);
  if (posts.length === 0) notFound();

  const totalPages = pageCount(posts.length, BLOG_CATEGORY_PAGE_SIZE);
  if (page < 1) notFound();
  if (page > totalPages) notFound();

  const pagePosts = paginateBlogs(posts, page, BLOG_CATEGORY_PAGE_SIZE);
  const breadcrumbJsonLd = buildBreadcrumbList([
    { name: 'Home', url: `${SITE_URL}/` },
    { name: 'Blog', url: `${SITE_URL}/blog` },
    { name: component.label, url: `${SITE_URL}/blog/category/${category}` },
  ]);

  return (
    <>
      <Script
        id={`json-ld-category-${category}-${page}`}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <main className="bg-white">
        <section className="border-b border-[#E5E7EB] px-5 py-10 md:py-14">
          <div className="container mx-auto">
            <nav className="mb-6 text-sm text-[#6C757D]" aria-label="Breadcrumb">
              <Link href="/" className="hover:text-[#292F6C]">Home</Link>
              <span className="mx-2">/</span>
              <Link href="/blog" className="hover:text-[#292F6C]">Blog</Link>
              <span className="mx-2">/</span>
              <span className="text-[#292F6C]">{component.label}</span>
            </nav>
            <div className="grid gap-6 md:grid-cols-[1fr_320px] md:items-end">
              <div>
                <h1 className="text-[#292F6C] tahoma text-[30px] font-bold md:text-[42px]">
                  {component.label}
                </h1>
                <p className="mt-4 max-w-3xl text-[#495057] roboto text-base leading-7">
                  {component.description}
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
              <TrackedCtaLink
                href="/contact-agent"
                className="rounded-custom bg-[#a81f23] px-5 py-3 text-sm font-bold text-white"
                cta={{
                  ctaId: 'blog_category_find_agent',
                  ctaIntent: 'contact_agent',
                  ctaPosition: 'blog_category_header',
                  ctaComponent: 'blog_category_page',
                  ctaLabel: 'Find an Agent',
                  destination: '/contact-agent',
                  pageType: 'blog_category',
                  contentType: 'blog_category',
                  partnerType: 'agent',
                }}
              >
                Find an Agent
              </TrackedCtaLink>
            </div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3 lg:grid-cols-4">
              {pagePosts.map((post) => (
                <BlogMovingPcsingPost key={post.slug} blogDetails={post} />
              ))}
            </div>
            {totalPages > 1 && (
              <nav className="mt-10 flex items-center justify-center gap-3" aria-label="Category pagination">
                {page > 1 && (
                  <Link
                    href={page === 2 ? `/blog/category/${category}` : `/blog/category/${category}/page/${page - 1}`}
                    className="min-h-11 rounded border border-[#E2E4E5] px-4 py-3 text-[#292F6C]"
                  >
                    Previous
                  </Link>
                )}
                {page < totalPages && (
                  <Link
                    href={`/blog/category/${category}/page/${page + 1}`}
                    className="min-h-11 rounded border border-[#E2E4E5] px-4 py-3 text-[#292F6C]"
                  >
                    Next
                  </Link>
                )}
              </nav>
            )}
          </div>
        </section>
      </main>
    </>
  );
}

export async function categoryStaticParams() {
  return BLOG_COMPONENTS.map((component) => ({ category: component.slug }));
}
