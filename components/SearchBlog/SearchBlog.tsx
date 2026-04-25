import "@/app/globals.css";
import Image from "next/image";
import Link from "next/link";
import { formatDate } from "@/utils/helper";
import { excerpt } from "@/lib/blog/mdx";
import type { BlogPost } from "@/lib/blog/types";

type Props = { searchedBlog: BlogPost[] };

export default function SearchBlog({ searchedBlog }: Props) {
  if (!searchedBlog || searchedBlog.length === 0) {
    return (
      <div className="text-center my-10">
        <p className="text-gray-600 text-lg">No blogs found.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto md:mt-36 sm:mt-5 mt-5 px-5">
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
            <form method="GET" action="/blog-search" className="mb-8">
              <div className="flex gap-2">
                <input
                  name="query"
                  type="text"
                  placeholder="Search"
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button type="submit" className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                  Search
                </button>
              </div>
            </form>
          </aside>
        </div>
      </div>
    </div>
  );
}
