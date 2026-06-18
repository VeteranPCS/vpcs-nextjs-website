import { notFound } from "next/navigation";
import Script from "next/script";
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
import { getBlogBySlug, getBlogSlugs } from "@/lib/blog/mdx";
import { resolveAuthor } from "@/lib/blog/authors";
import { getStateForBlog } from "@/lib/blog/getStateForBlog";
import { splitMdxAtMidpoint } from "@/lib/blog/splitMdxAtMidpoint";
import { formatDate } from "@/utils/helper";
import { buildBreadcrumbList } from "@/lib/structured-data";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

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
    const bridgeState = getStateForBlog(slug);

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
            <BlogDetailsHeroSection blog={blog} resolvedAuthor={resolvedAuthor} />
            <BlogBeginingPostAgent
                blog={blog}
                bodyFirstHalf={bodyFirstHalf}
                resolvedAuthor={resolvedAuthor}
            />
            {bridgeState && (
                <FindAgentInState state={bridgeState} blogSlug={slug} position="top" />
            )}
            <Testimonials />
            <BlogDetailsCta />
            <EndBlogPostDetails
                bodySecondHalf={bodySecondHalf}
                resolvedAuthor={resolvedAuthor}
            />
            {bridgeState && (
                <FindAgentInState state={bridgeState} blogSlug={slug} position="bottom" />
            )}
            <CommonBlog component={blog.component || ""} />
            <FrequentlyAskedQuestion />
            <KeepInTouch />
        </>
    );
}
