import { notFound } from "next/navigation";
import Script from "next/script";
import Link from "next/link";
import { cache } from "react";
import { BlogPosting, WithContext } from "schema-dts";
import BlogDetailsHeroSection from "@/components/BlogDetails/BlogDetailsHeroSection/BlogDetailsHeroSection";
import BlogBeginingPostAgent from "@/components/BlogDetails/BlogBeginingBlogPostAgent/BlogBeginingBlogPostAgent";
import Testimonials from "@/components/Testimonials/TestimonialPage";
import BlogDetailsCta from "@/components/BlogDetails/BlogDetailsCta/BlogDetailsCta";
import EndBlogPostDetails from "@/components/BlogDetails/EndBlogPostDetails/EndBlogPostDetails";
import FrequentlyAskedQuestion from "@/components/stories/FrequentlyAskedQuestions/FrequentlyAskedQuestions";
import KeepInTouch from "@/components/homepage/KeepInTouch/KeepInTouch";
import CommonBlog from "@/components/BlogPage/BlogPage/BlogCTA/CommonBlog";
import FindAgentInState from "@/components/Blog/FindAgentInState";
import { ContentViewedTracker } from "@/components/Analytics/Trackers";
import {
    extractTocHeadings,
    getBlogBySlug,
    getBlogSlugs,
    readingTimeMinutes,
} from "@/lib/blog/mdx";
import { resolveAuthor } from "@/lib/blog/authors";
import {
    getStateDisplayName,
    resolveBlogStateSlug,
} from "@/lib/blog/state";
import { splitMdxAtMidpoint } from "@/lib/blog/splitMdxAtMidpoint";
import { formatDate } from "@/utils/helper";
import { buildBreadcrumbList } from "@/lib/structured-data";
import { SITE_URL } from "@/lib/siteUrl";
import { buildContactCtaHref } from "@/lib/contactAgentUrl";
import TrackedCtaLink from "@/components/common/TrackedCtaLink";

const BASE_URL = SITE_URL;

const getBlogPageData = cache(async (slug: string) => {
    const blog = await getBlogBySlug(slug);
    if (!blog) return null;

    const resolvedAuthor = await resolveAuthor(blog.author);
    return { blog, resolvedAuthor };
});

export async function generateStaticParams() {
    const slugs = await getBlogSlugs();
    return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata(props: { params: Promise<{ slug: string }> }) {
    const params = await props.params;
    const pageData = await getBlogPageData(params.slug);

    if (!pageData) {
        return { title: "Blog not found" };
    }

    const { blog, resolvedAuthor } = pageData;

    return {
        title: blog.metaTitle,
        description: blog.metaDescription,
        alternates: {
            canonical: `${BASE_URL}/blog/${params.slug}`,
        },
        openGraph: {
            title: blog.metaTitle,
            description: blog.metaDescription,
            url: `${BASE_URL}/blog/${params.slug}`,
            type: "article",
            authors: [resolvedAuthor.name],
        },
        twitter: {
            card: "summary_large_image",
            title: blog.metaTitle,
            description: blog.metaDescription,
        },
    };
}

export default async function Home(props: { params: Promise<{ slug: string }> }) {
    const { slug } = await props.params;
    const pageData = await getBlogPageData(slug);

    if (!pageData) {
        notFound();
    }

    const { blog, resolvedAuthor } = pageData;
    const { first: bodyFirstHalf, second: bodySecondHalf } = splitMdxAtMidpoint(blog.content);
    const bridgeState = resolveBlogStateSlug(blog);
    const tocHeadings = extractTocHeadings(blog.content);
    const firstHeadingCount = extractTocHeadings(bodyFirstHalf).length;
    const firstHeadingIds = tocHeadings.slice(0, firstHeadingCount);
    const secondHeadingIds = tocHeadings.slice(firstHeadingCount);
    const readingMinutes = readingTimeMinutes(blog.content);
    const contactHref = buildContactCtaHref({ stateSlug: bridgeState, form: "agent" });
    const ctaLabel = bridgeState
        ? `Find an agent in ${getStateDisplayName(bridgeState)}`
        : "Find an Agent";

    const heroImageUrl = blog.mainImage?.src
        ? `${BASE_URL}${blog.mainImage.src}`
        : `${BASE_URL}/assets/blogctabgimage.png`;

    const jsonLd: WithContext<BlogPosting> = {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        "@id": `${BASE_URL}/blog/${slug}`,
        abstract: blog.metaDescription,
        mainEntityOfPage: {
            "@type": "WebPage",
            "@id": `${BASE_URL}/blog/${slug}`,
        },
        headline: blog.title,
        image: heroImageUrl,
        datePublished: formatDate(blog.publishedAt),
        dateModified: formatDate(blog.updatedAt ?? blog.publishedAt),
        author: resolvedAuthor.kind === "salesforce"
            ? {
                "@type": "Person",
                name: resolvedAuthor.name,
            }
            : {
                "@type": "Organization",
                name: resolvedAuthor.name,
            },
        publisher: {
            "@type": "Organization",
            name: "VeteranPCS",
            logo: {
                "@type": "ImageObject",
                url: `${BASE_URL}/icon/VeteranPCSlogo.svg`,
            },
        },
        isPartOf: {
            "@type": "WebSite",
            "@id": `${BASE_URL}/blog`,
            name: "VeteranPCS Blog",
            publisher: {
                "@type": "Organization",
                name: "VeteranPCS",
                logo: {
                    "@type": "ImageObject",
                    url: `${BASE_URL}/icon/VeteranPCSlogo.svg`,
                },
            },
        },
    };

    const breadcrumbJsonLd = buildBreadcrumbList([
        { name: "Home", url: `${BASE_URL}/` },
        { name: "Blog", url: `${BASE_URL}/blog` },
        { name: blog.title, url: `${BASE_URL}/blog/${slug}` },
    ]);

    return (
        <>
            <Script
                id={`json-ld-blog-${slug}`}
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <Script
                id={`json-ld-blog-breadcrumb-${slug}`}
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
            />
            <ContentViewedTracker
                contentId={blog.sanityId}
                contentSlug={slug}
                contentType="blog_post"
                topicCluster={blog.component || blog.categories?.[0]}
            />
            <BlogDetailsHeroSection blog={blog} resolvedAuthor={resolvedAuthor} />
            <nav className="container mx-auto px-5 pt-8 text-sm text-[#6C757D]" aria-label="Breadcrumb">
                <Link href="/" className="hover:text-[#292F6C]">Home</Link>
                <span className="mx-2">/</span>
                <Link href="/blog" className="hover:text-[#292F6C]">Blog</Link>
                <span className="mx-2">/</span>
                <span className="text-[#292F6C]">{blog.title}</span>
            </nav>
            <BlogBeginingPostAgent
                blog={blog}
                bodyFirstHalf={bodyFirstHalf}
                resolvedAuthor={resolvedAuthor}
                readingMinutes={readingMinutes}
                tocHeadings={tocHeadings}
                headingIds={firstHeadingIds}
            />
            {bridgeState && (
                <FindAgentInState state={bridgeState} blogSlug={slug} position="top" />
            )}
            <Testimonials />
            <BlogDetailsCta />
            <EndBlogPostDetails
                bodySecondHalf={bodySecondHalf}
                resolvedAuthor={resolvedAuthor}
                headingIds={secondHeadingIds}
            />
            {bridgeState && (
                <FindAgentInState state={bridgeState} blogSlug={slug} position="bottom" />
            )}
            <CommonBlog
                component={blog.component || ""}
                currentSlug={slug}
                stateSlug={bridgeState}
                categories={blog.categories}
                primaryKeyword={blog.primaryKeyword}
            />
            <FrequentlyAskedQuestion />
            <KeepInTouch />
            <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#E5E7EB] bg-white/95 px-5 py-3 shadow-lg md:hidden">
                <TrackedCtaLink
                    href={contactHref}
                    className="block min-h-11 rounded-custom bg-[#a81f23] px-5 py-3 text-center text-sm font-bold text-white"
                    cta={{
                        ctaId: 'blog_mobile_sticky_agent',
                        ctaIntent: 'contact_agent',
                        ctaPosition: 'mobile_sticky_footer',
                        ctaComponent: 'blog_mobile_sticky_cta',
                        ctaLabel,
                        destination: contactHref,
                        pageType: 'blog_post',
                        stateSlug: bridgeState,
                        contentSlug: slug,
                        contentType: 'blog_post',
                        partnerType: 'agent',
                    }}
                >
                    {ctaLabel}
                </TrackedCtaLink>
            </div>
        </>
    );
}
