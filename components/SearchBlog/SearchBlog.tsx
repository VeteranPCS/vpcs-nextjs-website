import React from "react";
import "@/styles/globals.css";
import Image from "next/image";
import { formatDate } from "@/utils/helper";
import Link from "next/link";
export interface BlockChild {
  _type: string;
  text: string;
}

export interface Block {
  _type: string;
  children: BlockChild[];
}

export interface MainImage {
  asset: {
    url: string;
  };
  alt: string;
}

export interface BlogDetails {
  _id: string;
  title: string;
  slug: { current: string };
  publishedAt: string;
  mainImage: MainImage;
  content: Block[]; // Assuming content is an array of Block objects
}

const getPlainText = (content: Block[]): string => {
  if (!content) return '';

  return content
    .map((block) => {
      if (block._type !== 'block' || !block.children) return '';
      return block.children
        .map((child) => child.text)
        .join('');
    })
    .join('\n\n');
};

const SearchBlog = ({ searchedBlog }: { searchedBlog: BlogDetails[] }) => {
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
          {searchedBlog.map((blog) => (
            <div className="my-10" key={blog._id}>
              <Link href={`/blog/${blog?.slug?.current}`}>
                <Image
                  src={blog?.mainImage?.asset?.url}
                  alt={blog?.mainImage?.alt || "Blog image"}
                  width={1000}
                  height={1000}
                  className="w-full h-full object-cover"
                />
              </Link>
              <div className="mt-5">
                <a
                  href={`/blog/${blog?.slug?.current}`}
                  className="text-[#292F6C] font-bold lg:text-[48px] md:text-[29px] sm:text-[25px] text-[20px] tahoma lg:block md:block"
                >
                  {blog?.title}
                </a>
                <p className="text-[#000000] lg:text-[18px] md:text-[19px] sm:text-[16px] text-[13px] mt-5">
                  {formatDate(blog?.publishedAt)}
                </p>
                <div>
                  <p className="text-[#000000] font-medium lg:text-[18px] md:text-[19px] sm:text-[16px] text-[13px] mt-7 font-poppins line-clamp-3">
                    {getPlainText(blog?.content)}
                  </p>
                </div>
              </div>
            </div>
          ))
          }

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

            <div>
              <h2 className="text-2xl font-bold text-blue-900 mb-6">
                Recent Posts
              </h2>
              <div className="space-y-4">
                <a
                  href="#"
                  className="block hover:bg-gray-50  p-2 rounded-lg transition-colors"
                >
                  <h3 className="text-gray-800 hover:text-blue-900 font-medium mb-1">
                    Top 10 Things to Love About Living in Spokane
                  </h3>
                </a>

                <a
                  href="#"
                  className="block hover:bg-gray-50 p-2 rounded-lg transition-colors"
                >
                  <h3 className="text-gray-800 hover:text-blue-900 font-medium mb-1">
                    New home builders offering 4.99%, 4.5%, or even 4% rates?
                    Here&apos;s the clarity you need to know
                  </h3>
                </a>

                <a
                  href="#"
                  className="block hover:bg-gray-50  p-2 rounded-lg transition-colors"
                >
                  <h3 className="text-gray-800 hover:text-blue-900 font-medium mb-1">
                    12 Tips for a successful PCS move or home relocation
                  </h3>
                </a>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default SearchBlog;
