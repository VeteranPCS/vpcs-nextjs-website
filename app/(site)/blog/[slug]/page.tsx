import { notFound } from "next/navigation";
import { cache } from "react";
import { BlogPosting, WithContext } from "schema-dts";
import { ContentViewedTracker } from "@/components/Analytics/Trackers";
import {
    componentSlugForBlog,
    getAllBlogs,
    getBlogBySlug,
    getBlogSlugs,
} from "@/lib/blog/mdx";
import { getBlogComponentBySlug, getBlogCtaIntent } from "@/lib/blog/components";
import { pickRelated, rankRelatedBlogs } from "@/lib/blog/related";
import { resolveAuthor } from "@/lib/blog/authors";
import {
    resolveBlogStateSlug,
} from "@/lib/blog/state";
import { formatDate } from "@/utils/helper";
import { buildBreadcrumbList } from "@/lib/structured-data";
import { SITE_URL } from "@/lib/siteUrl";

import StephArticle from '@/components/BlogDetails/StephArticle/StephArticle';

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
    const bridgeState = resolveBlogStateSlug(blog);
    const blogComponent = getBlogComponentBySlug(componentSlugForBlog(blog));
    const ctaIntent = getBlogCtaIntent(blogComponent?.slug);
    const allBlogs = await getAllBlogs();
    const rankedRelated = rankRelatedBlogs(allBlogs, blog);
    const related = pickRelated(rankedRelated, { limit: 4, crossComponentMin: 1 });

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
        ...(blogComponent
            ? [{ name: blogComponent.label, url: `${BASE_URL}/blog/category/${blogComponent.slug}` }]
            : []),
        { name: blog.title, url: `${BASE_URL}/blog/${slug}` },
    ]);

    return (
        <div>
            <script
                id={`json-ld-blog-${slug}`}
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <script
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
            <StephArticle blog={blog} resolvedAuthor={resolvedAuthor} stateSlug={bridgeState} intent={ctaIntent} category={blogComponent ? {label:blogComponent.label,slug:blogComponent.slug} : null} related={related} />
        </div>
    );
}
