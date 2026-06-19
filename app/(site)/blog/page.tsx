import BlogPageHeroSection from "@/components/BlogPage/BlogPage/BlogPageHeroSection/BlogPageHeroSection";
import BlogMovingPcsingBlogPostSection from "@/components/BlogPage/BlogPage/BlogMovingPcsingBlogPostSection/BlogMovingPcsingBlogPostSection";
import BlogCta from "@/components/BlogPage/BlogPage/BlogCTA/BlogCta";
import PcsResourcesBlog from "@/components/PcsResources/PcsResourcesBlog/PcsResourcesBlog";
import KeepInTouch from "@/components/homepage/KeepInTouch/KeepInTouch";
import { getAllBlogs, groupBlogsByComponent } from "@/lib/blog/mdx";
import { Metadata } from "next";
import { SITE_URL } from "@/lib/siteUrl";
import { BLOG_COMPONENTS } from "@/lib/blog/components";

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

export default async function Home() {
  const blogs = await getAllBlogs();
  if (blogs.length === 0) {
    return <p>Failed to load the blog.</p>;
  }
  const groupedBlogs = await groupBlogsByComponent();
  const orderedGroups = BLOG_COMPONENTS
    .map((component) => [component.label, groupedBlogs[component.label] ?? []] as const)
    .filter(([, blogsList]) => blogsList.length > 0);
  const categories_list = new Set(orderedGroups.map(([component]) => component));

  return (
    <>
      <BlogPageHeroSection blog={blogs[0]} />
      {orderedGroups.map(([component, blogsList], index) => (
        index === 0 && <BlogMovingPcsingBlogPostSection key={component} blogList={blogsList.slice(0, 9)} component={component} categories_list={categories_list} />
      ))}
      <BlogCta />
      {orderedGroups.map(([component, blogsList], index) => (
        index !== 0 && <PcsResourcesBlog key={component} blogList={blogsList.slice(0, 6)} component={component} />
      ))}
      <KeepInTouch />
    </>
  );
}
