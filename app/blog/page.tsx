import BlogPageHeroSection from "@/components/BlogPage/BlogPage/BlogPageHeroSection/BlogPageHeroSection";
import BlogMovingPcsingBlogPostSection from "@/components/BlogPage/BlogPage/BlogMovingPcsingBlogPostSection/BlogMovingPcsingBlogPostSection";
import BlogCta from "@/components/BlogPage/BlogPage/BlogCTA/BlogCta";
import PcsResourcesBlog from "@/components/PcsResources/PcsResourcesBlog/PcsResourcesBlog";
import KeepInTouch from "@/components/homepage/KeepInTouch/KeepInTouch";
import Footer from "@/components/Footer/Footer";
import { memo } from "react";
import blogService from "@/services/blogService";
export interface Author {
  name: string;
  image: string;
  designation: string;
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
  // meta_title: string;
  // meta_description: string;
  short_title: string,
  logo: string
}

export interface GroupedBlogs {
  [key: string]: BlogDetails[];
}

export interface BlogService {
  fetchBlogs: () => Promise<BlogDetails[]>;
}

const MemoizedKeepInTouch = memo(KeepInTouch);

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
      <MemoizedKeepInTouch />
      <Footer />
    </>
  );
}
