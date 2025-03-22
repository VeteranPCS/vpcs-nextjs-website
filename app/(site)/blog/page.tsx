import BlogPageHeroSection from "@/components/BlogPage/BlogPage/BlogPageHeroSection/BlogPageHeroSection";
import BlogMovingPcsingBlogPostSection from "@/components/BlogPage/BlogPage/BlogMovingPcsingBlogPostSection/BlogMovingPcsingBlogPostSection";
import BlogCta from "@/components/BlogPage/BlogPage/BlogCTA/BlogCta";
import PcsResourcesBlog from "@/components/PcsResources/PcsResourcesBlog/PcsResourcesBlog";
import KeepInTouch from "@/components/homepage/KeepInTouch/KeepInTouch";
import blogService from "@/services/blogService";
import { Metadata } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export interface Author {
  name: string;
  image: string;
  military_status: string;
}

export interface Category {
  _id: string;
  title: string;
}

export interface BlogDetails {
  _id: string;
  title: string;
  content: any[]; // Consider creating a more specific type for the content structure
  _createdAt: string;
  slug: { current: string };
  mainImage: { image_url: string; alt: string };
  categories: Category[];
  author: Author;
  component: string;  // Added field for grouping by component
  publishedAt: string;  // Added field for sorting blogs
  meta_title: string;
  meta_description: string;
  short_title: string,
  logo: string
}

export interface GroupedBlogs {
  [key: string]: BlogDetails[];
}

export interface BlogService {
  fetchBlogs: () => Promise<BlogDetails[]>;
}

const META_TITLE = "Military PCS & VA Loan Guides - Real Estate Advice for Service Members";
const META_DESCRIPTION = "Expert resources for military homebuyers and sellers. Get PCS checklists, BAH maximization strategies, VA loan qualification guides, and base-specific housing insights written by veterans who've been in your boots.";


export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL || ""),
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
  let blogs: BlogDetails[] | null = null;
  let groupedBlogs: GroupedBlogs | null = null;
  let categories_list: Set<string> = new Set();

  try {
    blogs = await blogService.fetchBlogs();

    if (blogs) {
      // Group and sort blogs
      groupedBlogs = blogs.reduce((acc: GroupedBlogs, blog: BlogDetails) => {
        const { component, publishedAt } = blog;

        categories_list.add(component);
        // Add component as a key in the accumulator
        if (!acc[component]) acc[component] = [];
        acc[component].push(blog);

        // Sort blogs in descending order of publishedAt
        acc[component].sort((a, b) => {
          const dateA = new Date(a.publishedAt); // Convert to Date object
          const dateB = new Date(b.publishedAt); // Convert to Date object
          return dateB.getTime() - dateA.getTime(); // Compare as timestamps
        });

        return acc;
      }, {});
    }

  } catch (error) {
    console.error("Error fetching blogs", error);
  }

  if (!blogs) {
    return <p>Failed to load the blog.</p>;
  }

  if (!groupedBlogs) {
    return <p>Failed to load the blog.</p>;
  }

  return (
    <>
      <BlogPageHeroSection blog={blogs[0]} />
      {Object.entries(groupedBlogs).map(([component, blogsList], index) => (
        index === 0 && <BlogMovingPcsingBlogPostSection key={index} blogList={blogsList} component={component} categories_list={categories_list} />
      ))}
      <BlogCta />
      {Object.entries(groupedBlogs).map(([component, blogsList], index) => (
        index !== 0 && <PcsResourcesBlog key={index} blogList={blogsList} component={component} />
      ))}
      <KeepInTouch />
    </>
  );
}
