import "@/app/globals.css";
import Image from "next/image";
import Link from "next/link";
import { formatDate } from "@/utils/helper";
import { excerpt } from "@/lib/blog/mdx";
import type { BlogPost } from "@/lib/blog/types";
import { BLOG_COMPONENTS } from "@/lib/blog/components";
import BlogSearchForm from "@/components/BlogPage/BlogSearchForm";
import { BlogSearchTracker } from "@/components/Analytics/Trackers";

type Props = {
  searchedBlog: BlogPost[];
  query: string;
};

export default function SearchBlog({ searchedBlog, query }: Props) {
  const trimmedQuery = query.trim();

  if (!searchedBlog || searchedBlog.length === 0) {
    return (
      <div className="container mx-auto my-16 px-5">
        <BlogSearchTracker query={query} resultCount={0} />
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-[#292F6C] tahoma text-[30px] font-bold md:text-[42px]">
            No results{trimmedQuery ? ` for "${trimmedQuery}"` : ''}
          </h1>
          <div className="mx-auto mt-6 max-w-md">
            <BlogSearchForm id="blog-empty-search-query" defaultQuery={query} />
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link href="/blog" className="text-[#292F6C] font-bold">Back to all guides</Link>
            {BLOG_COMPONENTS.slice(0, 3).map((component) => (
              <Link key={component.slug} href={`/blog/category/${component.slug}`} className="text-[#292F6C] underline">
                {component.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto md:mt-36 sm:mt-5 mt-5 px-5">
      <BlogSearchTracker query={query} resultCount={searchedBlog.length} />
      <div className="max-w-3xl">
        <h1 className="text-[#292F6C] tahoma text-[30px] font-bold md:text-[42px]">
          {searchedBlog.length} result{searchedBlog.length === 1 ? '' : 's'}
          {trimmedQuery ? ` for "${trimmedQuery}"` : ''}
        </h1>
        <Link href="/blog" className="mt-4 inline-block text-[#292F6C] font-bold">
          Back to all guides
        </Link>
      </div>
      <div className="flex flex-wrap justify-start gap-10 my-10">
        <div className="lg:w-3/5 sm:w-full w-full xl:mr-14 lg:mr-5 md:mr-10 ">
          {searchedBlog.map((blog) => {
            const heroSrc = blog.mainImage?.src ?? "";
            const heroAlt = blog.mainImage?.alt ?? "Blog image";
            return (
              <div className="my-10" key={blog.slug}>
                <Link href={`/blog/${blog.slug}`}>
                  {heroSrc ? (
                    <Image
                      src={heroSrc}
                      alt={heroAlt}
                      width={1000}
                      height={1000}
                      className="w-full h-full object-cover"
                    />
                  ) : null}
                </Link>
                <div className="mt-5">
                  <a
                    href={`/blog/${blog.slug}`}
                    className="text-[#292F6C] font-bold lg:text-[48px] md:text-[29px] sm:text-[25px] text-[20px] tahoma lg:block md:block"
                  >
                    {blog.title}
                  </a>
                  <p className="text-[#000000] lg:text-[18px] md:text-[19px] sm:text-[16px] text-[13px] mt-5">
                    {formatDate(blog.publishedAt)}
                  </p>
                  <div>
                    <p className="text-[#000000] font-medium lg:text-[18px] md:text-[19px] sm:text-[16px] text-[13px] mt-7 font-poppins line-clamp-3">
                      {excerpt(blog.content, 300)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="lg:w-1/5 sm:w-full w-full">
          <aside className="w-full max-w-xs p-6 md:border-l border-b-0 sticky top-16 right-0 bg-white">
            <BlogSearchForm id="blog-results-search-query" className="mb-8" defaultQuery={query} />
          </aside>
        </div>
      </div>
    </div>
  );
}
