import "@/app/globals.css";
import { MDXRemote } from "next-mdx-remote/rsc";
import AuthorByline from "@/components/Blog/AuthorByline";
import { formatDate } from "@/utils/helper";
import { createBlogMdxComponents } from "@/mdx-components";
import { mdxOptions } from "@/lib/blog/mdx-options";
import type { BlogPost, ResolvedAuthor } from "@/lib/blog/types";
import type { TocHeading } from "@/lib/blog/mdx";

type Props = {
  blog: BlogPost;
  bodyFirstHalf: string;
  resolvedAuthor: ResolvedAuthor;
  readingMinutes: number;
  tocHeadings: TocHeading[];
  headingIds: TocHeading[];
};

export default function BlogBeginningBlogPostAgent({
  blog,
  bodyFirstHalf,
  resolvedAuthor,
  readingMinutes,
  tocHeadings,
  headingIds,
}: Props) {
  const mdxComponents = createBlogMdxComponents({ resolvedAuthor, headingIds });

  return (
    <div className="relative py-12 md:px-10 px-5">
      <div className="container mx-auto">
        <div className="flex flex-col lg:flex-row lg:gap-0 gap-10">
          <div className="w-full lg:w-1/5">
            <div className="flex flex-col justify-around items-center mb-4">
              <p className="text-[#495057] lora text-sm font-bold">
                {formatDate(blog.publishedAt)}
              </p>
              <p className="text-[#495057] lora text-sm font-bold">{readingMinutes} min read</p>
            </div>
            <AuthorByline
              frontmatterAuthor={blog.author}
              resolvedAuthor={resolvedAuthor}
              variant="card"
            />
            {tocHeadings.length > 0 && (
              <nav className="mt-8 hidden rounded border border-[#E5E7EB] p-4 lg:block" aria-label="Table of contents">
                <p className="text-[#292F6C] tahoma text-sm font-bold">In this guide</p>
                <ul className="mt-3 space-y-2">
                  {tocHeadings.map((heading) => (
                    <li key={heading.id}>
                      <a href={`#${heading.id}`} className="text-sm text-[#495057] hover:text-[#292F6C]">
                        {heading.text}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            )}
          </div>
          <article className="w-full lg:w-4/5 lg:pl-10">
            <MDXRemote source={bodyFirstHalf} components={mdxComponents} options={mdxOptions} />
          </article>
        </div>
      </div>
    </div>
  );
}
