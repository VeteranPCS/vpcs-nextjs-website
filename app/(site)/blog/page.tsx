import BlogPageHeroSection from "@/components/BlogPage/BlogPage/BlogPageHeroSection/BlogPageHeroSection";
import BlogMovingPcsingBlogPostSection from "@/components/BlogPage/BlogPage/BlogMovingPcsingBlogPostSection/BlogMovingPcsingBlogPostSection";
import BlogCta from "@/components/BlogPage/BlogPage/BlogCTA/BlogCta";
import PcsResourcesBlog from "@/components/PcsResources/PcsResourcesBlog/PcsResourcesBlog";
import KeepInTouch from "@/components/homepage/KeepInTouch/KeepInTouch";
import { getAllBlogs, groupBlogsByComponent } from "@/lib/blog/mdx";
import { Metadata } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

// Re-render daily so future-dated posts surface without a deploy.
export const revalidate = 86400;

const META_TITLE = "Military PCS & VA Loan Guides - Real Estate Advice for Service Members";
const META_DESCRIPTION = "Expert resources for military homebuyers and sellers. Get PCS checklists, BAH maximization strategies, VA loan qualification guides, and base-specific housing insights written by veterans who've been in your boots.";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL || "https://veteranpcs.com"),
  title: {
    template: "%s | VeteranPCS",
    default: META_TITLE,
  },
  alternates: {
    canonical: `${BASE_URL}/blog`,
  },
  description: META_DESCRIPTION,
  openGraph: {
    type: "website",
    locale: "en_US",
    url: BASE_URL,
    siteName: "VeteranPCS",
    images: [
      {
        url: `${BASE_URL}/opengraph/og-logo.png`,
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

export default async function Home() {
  const blogs = await getAllBlogs();
  if (blogs.length === 0) {
    return <p>Failed to load the blog.</p>;
  }
  const groupedBlogs = await groupBlogsByComponent();
  const categories_list = new Set(Object.keys(groupedBlogs));

  return (
    <>
      <BlogPageHeroSection blog={blogs[0]} />
      {Object.entries(groupedBlogs).map(([component, blogsList], index) => (
        index === 0 && <BlogMovingPcsingBlogPostSection key={component} blogList={blogsList} component={component} categories_list={categories_list} />
      ))}
      <BlogCta />
      {Object.entries(groupedBlogs).map(([component, blogsList], index) => (
        index !== 0 && <PcsResourcesBlog key={component} blogList={blogsList} component={component} />
      ))}
      <KeepInTouch />
    </>
  );
}
