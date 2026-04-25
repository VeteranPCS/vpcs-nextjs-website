import "@/app/globals.css";
import Link from "next/link";
import classes from "./PcsResourcesBlog.module.css";
import { formatDate } from "@/utils/helper";
import { excerpt } from "@/lib/blog/mdx";
import type { BlogPost } from "@/lib/blog/types";

type Props = {
  blogList: BlogPost[];
  component: string;
};

export default function PcsResourcesBlog({ blogList, component }: Props) {
  return (
    <div className="py-6 px-5" id={component}>
      <div className="container mx-auto">
        <div className="flex flex-wrap gap-5 items-end lg:justify-between md:justify-between sm:justify-center justify-center">
          <div className="lg:text-left md:text-left sm:text-center text-center">
            <h1 className="text-[#292F6C] lg:text-[42px] md:text-[42px] sm:text-[30px] text-[30px] font-bold tahoma lg:text-left md:text-left sm:text-center text-center">
              {component}
            </h1>
          </div>
        </div>
        <div
          className={`grid ${blogList.length === 1
            ? "lg:grid-cols-1"
            : blogList.length === 2
              ? "lg:grid-cols-2"
              : "lg:grid-cols-3"
            } md:grid-cols-2 sm:grid-cols-1 grid-cols-1 gap-6 mt-10`}
        >
          {blogList.map((blog) => {
            const bg = blog.mainImage?.src ?? "/assets/blogctabgimage.png";
            return (
              <Link
                href={blog.slug ? `/blog/${blog.slug}` : "/blog"}
                key={blog.slug}
                className={classes.blogimageone}
                style={{ backgroundImage: `url("${bg}")` }}
              >
                <div className="flex items-center absolute top-4 right-4 gap-2">
                  {blog.categories?.map((category) => (
                    <div
                      key={category}
                      className="rounded-lg bg-white/15 px-4 py-2 text-white roboto text-xs font-bold"
                    >
                      {category}
                    </div>
                  ))}
                </div>
                <div className="absolute bottom-4 left-2 px-6 py-1">
                  <p className="text-[#E5E5E5] lg:text-[14px] md:text-[14px] sm:text-[12px] text-[12px] font-normal leading-normal">
                    {formatDate(blog.publishedAt)}
                  </p>
                  <h3 className="text-white tahoma lg:text-[21px] md:text-[21px] sm:text-[15px] text-[15px] font-bold my-3">
                    {blog.title}
                  </h3>
                  <p className="text-[#E5E5E5] roboto lg:text-[14px] md:text-[14px] sm:text-[12px] text-[12px] font-normal lg:w-[370px] line-clamp-3">
                    {excerpt(blog.content, 250)}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
