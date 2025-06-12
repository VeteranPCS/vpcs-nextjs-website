import React from "react";
import "@/app/globals.css";
import Button from "@/components/common/Button";
import Image from "next/image";
import BlogContent from "@/components/Blog/BlockContent";
import Link from "next/link";
import { formatDate } from "@/utils/helper";

const BlogBeginningBlogPostAgent = ({ blog }: { blog: Record<string, any> }) => {
  const contentLength = blog.content.length;
  const halfwayPoint = Math.ceil(contentLength / 2);
  const firstHalfContent = blog.content.slice(0, halfwayPoint);


  return (
    <div className="relative py-12 md:px-10 px-5">
      <div className="container mx-auto">
        <div className="flex flex-col lg:flex-row lg:gap-0 gap-10">
          <div className="w-full lg:w-1/5">
            <div className="flex flex-col justify-around items-center mb-4">
              <p className="text-[#495057] lora text-sm font-bold">
                {formatDate(blog?._createdAt)}
              </p>
              <p className="text-[#495057] lora text-sm font-bold">4 minutes</p>
            </div>
            <div className="bg-[#E5E5E5] rounded-2xl p-10 text-center flex flex-col items-center max-w-xs w-full mx-auto mb-8 lg:mb-0">
              <div className="flex justify-center w-full">
                <Image
                  width={150}
                  height={150}
                  src={blog?.author?.image || "/assets/bloguser.png"}
                  alt={blog?.author?.name || "Author Profile Image"}
                  className="w-[150px] h-[150px]"
                />
              </div>
              <p className="text-[#495057] roboto text-sm font-normal mt-5">
                <b className="text-[#495057] tahoma">{blog?.author?.name}</b>
                <br />
                {blog?.author?.location || ""}
                <br />
                <b className="text-[#495057]">
                  {blog?.author?.military_status || ""}
                  <br />
                  {blog?.author?.brokerage || ""}
                </b>
              </p>
              <div className="w-full flex justify-center mt-4">
                <Link href={`/${blog?.author?.slug}`}>
                  <Button buttonText="Get in Touch" />
                </Link>
              </div>
            </div>
          </div>
          <article className="w-full lg:w-4/5 lg:pl-10">
            <BlogContent blocks={firstHalfContent} />
          </article>
        </div>
      </div>
    </div>
  );
};

export default BlogBeginningBlogPostAgent;
