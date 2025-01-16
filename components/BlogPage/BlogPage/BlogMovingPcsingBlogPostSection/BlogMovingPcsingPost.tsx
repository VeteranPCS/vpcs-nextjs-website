import React from "react";
import "@/styles/globals.css";
import Image from "next/image";
import Link from "next/link";
import { formatDate } from "@/utils/helper";

interface Category {
  _id: string;
  title: string;
}

interface Author {
  image: string;
  name: string;
  military_status: string;
}

interface BlogDetails {
  _id: string;
  title: string;
  content: any[]; // Adjust type based on the actual structure of content
  _createdAt: string;
  slug: { current: string };
  mainImage: { image_url: string; alt: string };
  categories: Category[];
  author: Author;
  short_title: string,
  logo: string
}

interface StatePageHeroSecondSectionProps {
  blogDetails: BlogDetails;
}

interface Child {
  text: string;
}

interface Block {
  _type: string;
  children: Child[];
}

const BlogMovingPcsingPost: React.FC<StatePageHeroSecondSectionProps> = ({ blogDetails }) => {
  const getPlainText = (content: Block[]): string => {
    if (!content) return '';

    return content
      .map(block => {
        if (block._type !== 'block' || !block.children) return '';
        return block.children
          .map(child => child.text)
          .join('');
      })
      .join('\n\n');
  };

  const plainTextContent = getPlainText(blogDetails?.content);
  return (
    <Link href={`/blog/${blogDetails?.slug?.current}`} className="pt-12 md:px-0 px-5">
      <div className="container mx-auto">
        <div className="w-full relative">
          <div className="relative">
            <Image
              src={blogDetails?.mainImage?.image_url || "/assets/BlogpostImage.png"}
              alt={blogDetails?.mainImage?.alt || "Blog post image"}
              width={310}
              height={280}
              className="w-full h-[280px] object-cover"
            />
            {/* Overlay for the short title */}
            <div className="absolute inset-0 flex items-center justify-center">
              <h2 className="text-white text-base font-bold text-center px-4">
                {blogDetails?.short_title || "Untitled"}
              </h2>
            </div>
          </div>
          {blogDetails?.categories?.length ? (
            <div className="flex items-center absolute top-4 right-4 gap-4">
              {blogDetails.categories.map((category) => (
                <div
                  key={category._id}
                  className="rounded-lg bg-white/15 px-4 py-2 text-white roboto text-xs font-bold"
                >
                  {category?.title}
                </div>
              ))}
            </div>
          ) : null}
          <div className="p-5 bg-[#FFFFFF]">
            <p className="text-[#6C757D] lora text-sm font-normal">
              {formatDate(blogDetails?._createdAt)}
            </p>
            <h3 className="text-[#495057] tahoma text-lg font-bold my-4 line-clamp-2">
              {blogDetails?.title}
            </h3>
            <p className="text-[#6C757D] roboto text-sm font-normal line-clamp-3">
              {plainTextContent}
            </p>
            <p className="bg-[#E5E5E5] p-[1px] w-full mt-5"></p>
            <div className="mt-5">
              <div className="flex items-center gap-4">
                <Image
                  width={100}
                  height={100}
                  src={blogDetails?.author?.image || "/assets/bloguser.png"}
                  alt="Author image"
                  className="w-12 h-12"
                />
                <div>
                  <h6 className="text-[#343A40] tahoma text-sm font-bold">{blogDetails?.author?.name || "Unknown Author"}</h6>
                  <p className="text-[#495057] tahoma text-sm font-normal">{blogDetails?.author?.military_status || "Unknown Designation"}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default BlogMovingPcsingPost;
