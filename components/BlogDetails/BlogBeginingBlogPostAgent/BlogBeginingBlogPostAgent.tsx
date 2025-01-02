import React from "react";
import "@/styles/globals.css";
import Button from "@/components/common/Button";
import Image from "next/image";
import BlogContent from "@/components/Blog/BlockContent";
import { formatDate } from "@/utils/helper";

const BlogBeginningBlogPostAgent = ({ blog }: { blog: Record<string, any> }) => {
  const contentLength = blog.content.length;
  const halfwayPoint = Math.ceil(contentLength / 2);
  const firstHalfContent = blog.content.slice(0, halfwayPoint);


  return (
    <div className="relative py-12 md:px-0 px-5">
      <div className="container mx-auto">
        <div className="flex flex-wrap lg:gap-0 gap-10">
          <div className="lg:w-1/5 md:w-1/5 sm:w-full w-full">
            <div className="flex justify-around items-center mb-4">
              <p className="text-[#495057] lora text-sm font-bold">
                {formatDate(blog?._createdAt)}
              </p>
              <p className="text-[#495057] lora text-sm font-bold">4 minutes</p>
            </div>
            <div className="bg-[#E5E5E5] rounded-2xl p-10 text-center">
              <div className="flex justify-center">
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
                Birmingham, AL
                <br />
                <b className="text-[#495057]">
                  Active Duty Army
                  <br />
                  Lokation Real Estate
                </b>
              </p>
              <div>
                <Button buttonText="Get in Touch" />
              </div>
            </div>
          </div>
          <div className="lg:w-4/5 md:w-4/5 sm:w-full w-full lg:pl-10">
            <BlogContent blocks={firstHalfContent} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlogBeginningBlogPostAgent;
