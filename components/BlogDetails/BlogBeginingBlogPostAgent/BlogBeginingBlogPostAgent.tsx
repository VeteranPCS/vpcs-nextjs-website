import "@/app/globals.css";
import { MDXRemote } from "next-mdx-remote/rsc";
import AuthorByline from "@/components/Blog/AuthorByline";
import { formatDate } from "@/utils/helper";
import { mdxComponents } from "@/mdx-components";
import type { BlogPost } from "@/lib/blog/types";

type Props = {
  blog: BlogPost;
  bodyFirstHalf: string;
};

export default function BlogBeginningBlogPostAgent({ blog, bodyFirstHalf }: Props) {
  return (
    <div className="relative py-12 md:px-10 px-5">
      <div className="container mx-auto">
        <div className="flex flex-col lg:flex-row lg:gap-0 gap-10">
          <div className="w-full lg:w-1/5">
            <div className="flex flex-col justify-around items-center mb-4">
              <p className="text-[#495057] lora text-sm font-bold">
                {formatDate(blog.publishedAt)}
              </p>
              <p className="text-[#495057] lora text-sm font-bold">4 minutes</p>
            </div>
            <AuthorByline frontmatterAuthor={blog.author} variant="card" />
          </div>
          <article className="w-full lg:w-4/5 lg:pl-10">
            <MDXRemote source={bodyFirstHalf} components={mdxComponents} />
          </article>
        </div>
      </div>
    </div>
  );
}
