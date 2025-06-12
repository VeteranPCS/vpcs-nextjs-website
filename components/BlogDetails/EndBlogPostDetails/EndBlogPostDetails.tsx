import React from "react";
import "@/app/globals.css";
import Link from "next/link";
import Image from "next/image";
import Button from "@/components/common/Button";
import BlogContent from "@/components/Blog/BlockContent";

interface BlogBeginingPostAgentProps {
  blog: Blog;
}

interface Blog {
  _id: string;
  title: string;
  description: string;
  content: any; // Define this type based on the structure of content
  mainImage: {
    image_url: string;
  };
  // Add other fields as needed
}

const EndBlogPostDetails = ({ blog }: { blog: Record<string, any> }) => {
  const contentLength = blog.content.length;
  const halfwayPoint = Math.ceil(contentLength / 2);
  const secondHalfContent = blog.content.slice(halfwayPoint);

  return (
    <div className="relative py-12 md:px-10 px-5">
      <div className="container mx-auto">
        <div className="flex flex-wrap lg:gap-0 gap-10">
          <div className="lg:w-1/5 md:w-1/5 sm:w-full w-full">
            {/* Empty div to maintain layout structure */}
          </div>
          <article className="lg:w-4/5 md:w-4/5 sm:w-full w-full lg:pl-10">
            <BlogContent blocks={secondHalfContent} />
          </article>
        </div>
      </div>
    </div>
  );
};

export default EndBlogPostDetails;
