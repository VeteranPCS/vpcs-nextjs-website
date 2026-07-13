import BlogPageHeroSection from "@/components/BlogPage/BlogPage/BlogPageHeroSection/BlogPageHeroSection";
import CategoryNavStrip from "@/components/BlogPage/BlogPage/CategoryNavStrip";
import StartHereRow from "@/components/BlogPage/BlogPage/StartHereRow";
import StateBrowseRail from "@/components/BlogPage/BlogPage/StateBrowseRail";
import BlogCta from "@/components/BlogPage/BlogPage/BlogCTA/BlogCta";
import BlogCardRail from "@/components/Blog/BlogCard/BlogCardRail";
import PaginationNav from "@/components/common/PaginationNav";
import KeepInTouch from "@/components/homepage/KeepInTouch/KeepInTouch";
import {
  BLOG_CATEGORY_PAGE_SIZE,
  getAllBlogs,
  groupBlogsByComponent,
  pageCount,
} from "@/lib/blog/mdx";
import { toBlogCardData } from "@/lib/blog/cards";
import { buildPagedPath } from "@/lib/blog/pagination";
import { getStatePostCounts } from "@/lib/blog/registry";
import { BLOG_COMPONENTS } from "@/lib/blog/components";
import { STATE_SLUG_TO_NAME } from "@/lib/states";
import { buildBlogItemList, buildCollectionPage } from "@/lib/structured-data";
import blogPillars from "@/content/_data/blog-pillars.json";
import type { BlogPost } from "@/lib/blog/types";
import { Metadata } from "next";
import { SITE_URL } from "@/lib/siteUrl";

// Re-render daily so future-dated posts surface without a deploy.
export const revalidate = 86400;

const META_TITLE = "Military PCS & VA Loan Guides - Real Estate Advice for Service Members";
const META_DESCRIPTION = "Expert resources for military homebuyers and sellers. Get PCS checklists, BAH maximization strategies, VA loan qualification guides, and base-specific housing insights written by veterans who've been in your boots.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    template: "%s | VeteranPCS",
    default: META_TITLE,
  },
  alternates: {
    canonical: `${SITE_URL}/blog`,
    types: {
      "application/rss+xml": "/rss.xml",
    },
  },
  description: META_DESCRIPTION,
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: "VeteranPCS",
    images: [
      {
        url: `${SITE_URL}/opengraph/og-logo.png`,
        width: 1200,
        height: 630,
        alt: "VeteranPCS",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    description: META_DESCRIPTION,
    title: META_TITLE,
    images: ['/opengraph/og-logo.png'],
  },
};

const START_HERE_MAX = 4;
const PCS_HELP_RAIL_SIZE = 6;
const DEFAULT_RAIL_SIZE = 3;
const LATEST_GUIDES_SIZE = BLOG_CATEGORY_PAGE_SIZE;
const STATE_RAIL_SIZE = 12;

export default async function Home() {
  const blogs = await getAllBlogs();
  if (blogs.length === 0) {
    return <p>Failed to load the blog.</p>;
  }

  // usedSlugs dedupes the editorial sections (hero, start-here, category
  // rails) against each other (fixes the old duplicate-hero bug). The
  // "Latest guides" grid is exempt: it is archive page 1 (see below).
  const hero = blogs[0]!; // non-empty: length checked above
  const usedSlugs = new Set<string>([hero.slug]);
  const blogsBySlug = new Map(blogs.map((blog) => [blog.slug, blog]));

  // Start-here row: editorial pillar picks, newest-unused fallback.
  const startHerePosts: BlogPost[] = [];
  for (const slug of blogPillars.landing) {
    if (startHerePosts.length >= START_HERE_MAX) break;
    if (usedSlugs.has(slug)) continue;
    const post = blogsBySlug.get(slug);
    if (!post) continue;
    startHerePosts.push(post);
    usedSlugs.add(post.slug);
  }
  for (const post of blogs) {
    if (startHerePosts.length >= START_HERE_MAX) break;
    if (usedSlugs.has(post.slug)) continue;
    startHerePosts.push(post);
    usedSlugs.add(post.slug);
  }

  const groupedBlogs = await groupBlogsByComponent();

  const navItems = BLOG_COMPONENTS
    .map((component) => ({
      slug: component.slug,
      label: component.label,
      count: (groupedBlogs[component.label] ?? []).length,
    }))
    .filter((item) => item.count > 0);

  const rails = BLOG_COMPONENTS
    .map((component) => {
      const limit = component.slug === "pcs-help" ? PCS_HELP_RAIL_SIZE : DEFAULT_RAIL_SIZE;
      const posts = (groupedBlogs[component.label] ?? [])
        .filter((blog) => !usedSlugs.has(blog.slug))
        .slice(0, limit);
      for (const post of posts) usedSlugs.add(post.slug);
      return { component, items: posts.map(toBlogCardData) };
    })
    .filter((rail) => rail.items.length > 0);

  const stateItems = getStatePostCounts()
    .slice(0, STATE_RAIL_SIZE)
    .map(({ stateSlug, count }) => ({
      stateSlug,
      count,
      name: STATE_SLUG_TO_NAME[stateSlug] ?? stateSlug,
    }));

  // The exact first archive slice, NOT deduped against the sections above:
  // /blog/page/N paginates the raw list, so this grid must be its page 1 or
  // the numbered pagination skips/repeats posts across pages. A few posts
  // featured above may repeat here; that's deliberate.
  const latestPosts = blogs.slice(0, LATEST_GUIDES_SIZE);
  const totalPages = pageCount(blogs.length, BLOG_CATEGORY_PAGE_SIZE);

  const itemListJsonLd = buildBlogItemList({
    url: `${SITE_URL}/blog`,
    name: "Latest military PCS and VA loan guides",
    items: latestPosts.map((post) => ({
      url: `${SITE_URL}/blog/${post.slug}`,
      name: post.title,
    })),
  });
  const collectionPageJsonLd = buildCollectionPage({
    url: `${SITE_URL}/blog`,
    name: META_TITLE,
    description: META_DESCRIPTION,
    itemList: itemListJsonLd,
  });

  return (
    <>
      {/* Plain script tags (not next/script) so the JSON-LD is in the SSR HTML. */}
      <script
        id="json-ld-blog-collection"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionPageJsonLd) }}
      />
      <script
        id="json-ld-blog-item-list"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
      <BlogPageHeroSection blog={hero} />
      <CategoryNavStrip items={navItems} />
      <StartHereRow items={startHerePosts.map(toBlogCardData)} />
      {rails.map(({ component, items }) => (
        <section
          key={component.slug}
          className={component.slug === "pcs-help" ? undefined : "bg-[#F4F5F9]"}
        >
          <BlogCardRail
            items={items}
            variant={component.slug === "pcs-help" ? "default" : "compact"}
            heading={component.label}
            headingHref={`/blog/category/${component.slug}`}
            headingLinkLabel="View all"
            viewAllCtaId="blog_landing_rail_view_all"
            cta={{
              ctaId: "blog_landing_rail_card",
              ctaPosition: "blog_landing_category_rail",
              pageType: "blog_landing",
            }}
          />
        </section>
      ))}
      <BlogCta />
      <StateBrowseRail states={stateItems} />
      <section className="border-t border-[#E2E4E5]">
        <BlogCardRail
          items={latestPosts.map(toBlogCardData)}
          variant="compact"
          heading="Latest guides"
          cta={{
            ctaId: "blog_landing_latest_card",
            ctaPosition: "blog_landing_latest",
            pageType: "blog_landing",
          }}
        />
        <div className="px-5 pb-12">
          <div className="container mx-auto">
            <PaginationNav
              currentPage={1}
              totalPages={totalPages}
              hrefFor={(page) => buildPagedPath("/blog", page)}
            />
          </div>
        </div>
      </section>
      <KeepInTouch />
    </>
  );
}
