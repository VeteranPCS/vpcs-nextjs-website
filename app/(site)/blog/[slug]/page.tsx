import BlogDetailsHeroSection from "@/components/BlogDetails/BlogDetailsHeroSection/BlogDetailsHeroSection";
import BlogBeginingPostAgent from "@/components/BlogDetails/BlogBeginingBlogPostAgent/BlogBeginingBlogPostAgent";
import Testimonials from "@/components/Testimonials/TestimonialPage";
import BlogDetailsCta from "@/components/BlogDetails/BlogDetailsCta/BlogDetailsCta";
import EndBlogPostDetails from "@/components/BlogDetails/EndBlogPostDetails/EndBlogPostDetails";
import FrequentlyAskedQuestion from "@/components/stories/FrequentlyAskedQuestions/FrequentlyAskedQuestions";
import KeepInTouch from "@/components/homepage/KeepInTouch/KeepInTouch";
import blogService from "@/services/blogService";
import CommonBlog from "@/components/BlogPage/BlogPage/BlogCTA/CommonBlog";
import { urlForImage } from "@/sanity/lib/image";
import Script from "next/script";
import { BlogPosting, WithContext } from "schema-dts";
import { formatDate } from "@/utils/helper";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

interface BlogProps {
    blog: Record<string, any> | null; // Allow blog to be null
}


export async function generateStaticParams() {
    try {
        const blogSlugs = await blogService.fetchBlogSlugs();

        return blogSlugs.map((slug) => ({
            slug: slug.slug,
        }));

    } catch (error) {
        console.error("Error generating static params:", error);
        return []; // Return an empty array to avoid breaking the build
    }
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
    const blog = await blogService.fetchBlog(params.slug);

    const openGraphImageURL = `${process.env.BASE_URL}/blog/${params.slug}/opengraph-image`;
    const twitterImageURL = `${process.env.BASE_URL}/blog/${params.slug}/twitter-image`;

    return {
        title: blog.meta_title,
        description: blog.meta_description,
        alternates: {
            canonical: `${BASE_URL}/blog/${params.slug}`,
        },
        openGraph: {
            title: blog.meta_title,
            description: blog.meta_description,
            url: `${BASE_URL}/blog/${params.slug}`,
            type: "article",
            authors: [blog.author.name],
            images: [
                {
                    url: openGraphImageURL,
                    width: 1200,
                    height: 630,
                    alt: "VeteranPCS Blog",
                },
            ],
        },
        twitter: {
            card: "summary_large_image",
            title: blog.meta_title,
            description: blog.meta_description,
            images: [twitterImageURL]
        },
    };
}

export default async function Home({ params }: { params: { slug: string } }) {
    const { slug } = await params;
    let blog: Record<string, any> | null = null;

    try {
        blog = await blogService.fetchBlog(slug); // fetch data on the server side
    } catch (error) {
        console.error("Error fetching blog", error);
    }

    // Check if blog is null and render error page
    if (!blog) {
        return <p>Failed to load the blog.</p>;
    }

    const jsonLd: WithContext<BlogPosting> = {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        "@id": `${BASE_URL}/blog/${params.slug}`,
        abstract: blog.meta_description,
        mainEntityOfPage: {
            "@type": "WebPage",
            "@id": `${BASE_URL}/blog/${params.slug}`,
        },
        headline: blog.title,
        image: `${blog.mainImage ? urlForImage(blog.mainImage) : BASE_URL + 'blogctabgimage.png'}`,
        datePublished: formatDate(blog._createdAt),
        author: {
            "@type": "Person",
            name: blog.author.name,
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
                id={`json-ld-blog-${params.slug}`}
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <BlogDetailsHeroSection blog={blog} />
            <BlogBeginingPostAgent blog={blog} />
            <Testimonials />
            <BlogDetailsCta />
            <EndBlogPostDetails blog={blog} />
            <CommonBlog component={blog.component || ""} />
            <FrequentlyAskedQuestion />
            <KeepInTouch />
        </>
    );
}
