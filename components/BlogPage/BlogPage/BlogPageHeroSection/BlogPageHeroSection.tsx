import "@/app/globals.css";
import classes from "./BlogPageHeroSection.module.css";
import Image from "next/image";
import Link from "next/link";
import { formatDate } from "@/utils/helper";
import { excerpt } from "@/lib/blog/mdx";
import type { BlogPost } from "@/lib/blog/types";

type Props = { blog: BlogPost };

export default function BlogPageHeroSection({ blog }: Props) {
  const bg = blog.mainImage?.src ?? "/assets/blogctabgimage.png";
  return (
    <div className="relative">
      <div
        className={classes.blogpageherosectioncontainer}
        style={{ backgroundImage: `url("${bg}")` }}
      >
        <Link href={`/blog/${blog.slug}`}>
          <div className="flex flex-col justify-center items-center">
            <div>
              <div className="text-center">
                {blog.categories?.[0] ? (
                  <span className="rounded-lg bg-white/15 py-1 px-3 text-white text-center roboto text-xsfont-bold mx-auto">
                    {blog.categories[0]}
                  </span>
                ) : null}
                <h1 className="text-white text-center tahoma lg:text-[36px] md:text-[36px] sm:text-[31px] text-[31px] font-bold mt-8 mb-3 leading-normal max-w-[800px]">
                  {blog.title}
                </h1>
                <div className="flex items-center justify-center">
                  <p className="text-white lora text-sm font-normal">
                    {formatDate(blog.publishedAt)}
                  </p>
                </div>
                <div>
                  <p className="text-white text-center lora text-sm font-normal lg:w-[510px] w-full mx-auto mt-10 leading-6 line-clamp-2">
                    {excerpt(blog.content, 250)}
                  </p>
                </div>
                {blog.author?.name ? (
                  <div>
                    <h6 className="text-white tahoma text-sm font-bold mt-10">
                      By {blog.author.name}
                    </h6>
                  </div>
                ) : null}
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
}
