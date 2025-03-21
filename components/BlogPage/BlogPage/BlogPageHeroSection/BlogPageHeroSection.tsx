import React from "react";
import "@/app/globals.css";
import classes from "./BlogPageHeroSection.module.css";
import Image from "next/image";
import { formatDate } from "@/utils/helper";
import { urlForImage } from "@/sanity/lib/image";
import Link from "next/link";

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
  short_title: string;
  logo: string
}

export interface Author {
  name: string;
  image: string;
  military_status: string;
}

export interface Category {
  _id: string;
  title: string;
}

const BlogPageHeroSection = ({ blog }: { blog: BlogDetails }) => {
  return (
    <div className="relative">
      <div className={classes.blogpageherosectioncontainer}
        style={{
          backgroundImage: `url("${urlForImage(blog?.mainImage || "")}")`,
        }}
      >
        <Link href={`/blog/${blog?.slug?.current}`}>
          <div className="flex flex-col justify-center items-center">
            <div>
              <div className="text-center">
                <span className="rounded-lg bg-white/15 py-1 px-3 text-white text-center roboto text-xsfont-bold mx-auto">
                  {blog?.categories[0]?.title}
                </span>
                <h1 className="text-white text-center tahoma lg:text-[36px] md:text-[36px] sm:text-[31px] text-[31px] font-bold mt-8 mb-3 leading-normal max-w-[800px]">
                  {blog?.title}
                </h1>
                <div className="flex items-center justify-center">
                  <p className="text-white lora text-sm font-normal">
                    {/* 04.23.2024 */}
                    {formatDate(blog?.publishedAt)}
                  </p>
                </div>
                <div>
                  <p className="text-white text-center lora text-sm font-normal lg:w-[510px] w-full mx-auto mt-10 leading-6 line-clamp-2">
                    {/* Temporary placeholder. Will need to add description field to blog schema. */}
                    {blog?.content[0]?.children[0]?.text.slice(0, 250)}
                  </p>
                </div>
                <div>
                  <h6 className="text-white tahoma text-sm font-bold mt-10">
                    By {blog?.author?.name}
                  </h6>
                </div>
                <div className="flex items-center justify-center sm:mt-10 mt-10 md:mt-0 md:hidden sm:ma-auto">
                  <input
                    type="text"
                    placeholder="Search"
                    className="w-full max-w-md px-4 py-3 border bg-[#F9F9F9] border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 "
                  />
                  <button className="bg-[#003486] hover:bg-blue-600 text-white px-4 py-4 rounded-r-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                    <Image
                      src="/icon/search.svg"
                      width={20}
                      height={20}
                      alt="search"
                      loading="eager"
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
};

export default BlogPageHeroSection;
