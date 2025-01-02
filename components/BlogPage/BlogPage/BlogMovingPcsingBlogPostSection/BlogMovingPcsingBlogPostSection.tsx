import React from "react";
import "@/styles/globals.css";
import BlogMovingPcsingPost from "@/components/BlogPage/BlogPage/BlogMovingPcsingBlogPostSection/BlogMovingPcsingPost";
import { Metadata } from "next";
import blogService from "@/services/blogService";
import BlogCategory from "@/components/BlogPage/BlogPage/BlogMovingPcsingBlogPostSection/BlogCategory";

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
  content: any[];
  _createdAt: string;
  slug: { current: string };
  mainImage: { image_url: string; alt: string };
  categories: Category[];
  author: Author;
}

const BlogMovingPcsingBlogPostSection = async ({ blogList, component, categories_list }: { blogList: BlogDetails[], component: string, categories_list: any }) => {
  return (
    <div className="relative py-12 md:px-0 px-5" id={component}>
      <div className="container mx-auto">
        <div className="flex justify-between items-center flex-wrap">
          <div>
            <div>
              <h1 className="text-[#292F6C] tahoma lg:text-[36px] md:text-[36px] text-[26px] font-bold">
                {component}
              </h1>
                <BlogCategory categories_list={categories_list} />
            </div>
          </div>
          <div>
          <form
            className="flex justify-center mt-6 w-[312px] md:inline-flex sm:hidden hidden"
            method="GET"
            action="/blog-search"
          >
            <input
              type="text"
              name="query"
              placeholder="Search"
              className="w-full max-w-md px-4 py-3 border bg-[#F9F9F9] border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
              <button
                type="submit"
                className="bg-[#003486] hover:bg-blue-600 text-white px-4 py-2 rounded-r-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="15"
                  viewBox="0 0 14 15"
                  fill="none"
                >
                  <g clipPath="url(#clip0_1165_239)">
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M9.8833 9.43232L13.4698 13.0188C13.5959 13.145 13.6666 13.316 13.6666 13.4944C13.6665 13.6727 13.5956 13.8437 13.4695 13.9698C13.3433 14.0958 13.1723 14.1666 12.9939 14.1666C12.8156 14.1665 12.6446 14.0956 12.5185 13.9694L8.93201 10.3829C7.85987 11.2134 6.51165 11.6041 5.16161 11.4758C3.81157 11.3474 2.56113 10.7096 1.66467 9.69205C0.768216 8.67448 0.293077 7.35363 0.335916 5.99818C0.378755 4.64273 0.936354 3.35451 1.89528 2.39558C2.8542 1.43666 4.14242 0.87906 5.49787 0.836221C6.85332 0.793382 8.17418 1.26852 9.19174 2.16498C10.2093 3.06144 10.8471 4.31188 10.9755 5.66191C11.1038 7.01195 10.713 8.36018 9.88264 9.43232H9.8833ZM5.66683 10.1663C6.72765 10.1663 7.74502 9.74488 8.49513 8.99477C9.24524 8.24466 9.66665 7.22729 9.66665 6.16647C9.66665 5.10566 9.24524 4.08829 8.49513 3.33818C7.74502 2.58807 6.72765 2.16666 5.66683 2.16666C4.60602 2.16666 3.58865 2.58807 2.83854 3.33818C2.08843 4.08829 1.66702 5.10566 1.66702 6.16647C1.66702 7.22729 2.08843 8.24466 2.83854 8.99477C3.58865 9.74488 4.60602 10.1663 5.66683 10.1663V10.1663Z"
                      fill="white"
                    />
                  </g>
                  <defs>
                    <clipPath id="clip0_1165_239">
                      <rect
                        width="13.3333"
                        height="13.3333"
                        fill="white"
                        transform="translate(0.333252 0.833313)"
                      />
                    </clipPath>
                  </defs>
                </svg>
              </button>
            </form>
            <div className="sm:flex justify-end mt-5 hidden">
              {/* <button className="text-[#292F6C] robot text-sm font-bold ">
                View All
              </button> */}
            </div>
          </div>
        </div>
        <div className="grid lg:grid-cols-4 md:grid-cols-3 sm:grid-cols-1 grid-cols-1 justify-center xl:gap-10 lg:gap-10 md:gap-10 sm:gap-2 gap-2 ">
          {blogList?.map((blog) => (
            <BlogMovingPcsingPost key={blog._id} blogDetails={blog} />
          ))}
        </div>
        <div className="flex justify-end mt-5 sm:hidden ">
          <button className="text-[#292F6C] robot text-sm font-bold ">
            View All
          </button>
        </div>
      </div>
    </div>
  );
};

export default BlogMovingPcsingBlogPostSection;
