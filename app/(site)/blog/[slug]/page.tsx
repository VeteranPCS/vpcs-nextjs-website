import { notFound } from "next/navigation";
import Script from "next/script";
import { BlogPosting, WithContext } from "schema-dts";
import BlogDetailsHeroSection from "@/components/BlogDetails/BlogDetailsHeroSection/BlogDetailsHeroSection";
import BlogBeginingPostAgent from "@/components/BlogDetails/BlogBeginingBlogPostAgent/BlogBeginingBlogPostAgent";
import Testimonials from "@/components/Testimonials/TestimonialPage";
import BlogDetailsCta from "@/components/BlogDetails/BlogDetailsCta/BlogDetailsCta";
import EndBlogPostDetails from "@/components/BlogDetails/EndBlogPostDetails/EndBlogPostDetails";
import FrequentlyAskedQuestion from "@/components/stories/FrequentlyAskedQuestions/FrequentlyAskedQuestions";
import KeepInTouch from "@/components/homepage/KeepInTouch/KeepInTouch";
import CommonBlog from "@/components/BlogPage/BlogPage/BlogCTA/CommonBlog";
import { getBlogBySlug, getBlogSlugs } from "@/lib/blog/mdx";
import { splitMdxAtMidpoint } from "@/lib/blog/splitMdxAtMidpoint";
import { formatDate } from "@/utils/helper";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export async function generateStaticParams() {
    const slugs = await getBlogSlugs();
    return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata(props: { params: Promise<{ slug: string }> }) {
    const params = await props.params;
    const blog = await getBlogBySlug(params.slug);

    if (!blog) {
        return { title: "Blog not found" };
    }

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
            authors: blog.author?.name ? [blog.author.name] : undefined,
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
    const blog = await getBlogBySlug(slug);

    if (!blog) {
        notFound();
    }

    const { first: bodyFirstHalf, second: bodySecondHalf } = splitMdxAtMidpoint(blog.content);

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
        author: {
            "@type": "Person",
            name: blog.author?.name ?? "VeteranPCS",
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

    return (
        <>
            <Script
                id={`json-ld-blog-${slug}`}
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <BlogDetailsHeroSection blog={blog} />
            <BlogBeginingPostAgent blog={blog} bodyFirstHalf={bodyFirstHalf} />
            <Testimonials />
            <BlogDetailsCta />
            <EndBlogPostDetails bodySecondHalf={bodySecondHalf} />
            <CommonBlog component={blog.component || ""} />
            <FrequentlyAskedQuestion />
            <KeepInTouch />
        </>
    );
}
