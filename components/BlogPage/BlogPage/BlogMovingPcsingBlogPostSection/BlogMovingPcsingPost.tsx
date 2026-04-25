import "@/app/globals.css";
import Image from "next/image";
import Link from "next/link";
import AuthorByline from "@/components/Blog/AuthorByline";
import { formatDate } from "@/utils/helper";
import { excerpt } from "@/lib/blog/mdx";
import type { BlogPost } from "@/lib/blog/types";

type Props = { blogDetails: BlogPost };

export default function BlogMovingPcsingPost({ blogDetails }: Props) {
  const heroSrc = blogDetails.mainImage?.src ?? "/assets/BlogpostImage.png";
  const heroAlt = blogDetails.mainImage?.alt ?? "Blog post image";
  return (
    <Link href={`/blog/${blogDetails.slug}`} className="pt-12 md:px-0 px-5">
      <div className="container mx-auto">
        <div className="w-full relative">
          <div className="relative">
            <Image
              src={heroSrc}
              alt={heroAlt}
              width={310}
              height={280}
              className="w-full h-[280px] object-cover"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <h2 className="text-white text-base font-bold text-center px-4">
                {blogDetails.shortTitle || blogDetails.title || "Untitled"}
              </h2>
            </div>
          </div>
          {blogDetails.categories?.length ? (
            <div className="flex items-center absolute top-4 right-4 gap-4">
              {blogDetails.categories.map((category) => (
                <div
                  key={category}
                  className="rounded-lg bg-white/15 px-4 py-2 text-white roboto text-xs font-bold"
                >
                  {category}
                </div>
              ))}
            </div>
          ) : null}
          <div className="p-5 bg-[#FFFFFF]">
            <p className="text-[#6C757D] lora text-sm font-normal">
              {formatDate(blogDetails.publishedAt)}
            </p>
            <h3 className="text-[#495057] tahoma text-lg font-bold my-4 line-clamp-2">
              {blogDetails.title}
            </h3>
            <p className="text-[#6C757D] roboto text-sm font-normal line-clamp-3">
              {excerpt(blogDetails.content, 250)}
            </p>
            <p className="bg-[#E5E5E5] p-[1px] w-full mt-5"></p>
            <div className="mt-5">
              <AuthorByline frontmatterAuthor={blogDetails.author} variant="inline" />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
