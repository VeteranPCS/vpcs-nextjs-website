import React from "react";
import "@/styles/globals.css";
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

const EndBlogPostDetails = ({blog}: { blog: Record<string, any> }) => {
  const contentLength = blog.content.length;
  const halfwayPoint = Math.ceil(contentLength / 2);
  const secondHalfContent = blog.content.slice(halfwayPoint);

  return (
    <div className="relative py-12 px-[16%]">
      <BlogContent blocks={secondHalfContent} />
    </div>
  );
};

export default EndBlogPostDetails;
