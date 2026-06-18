import "@/app/globals.css";
import { MDXRemote } from "next-mdx-remote/rsc";
import { createBlogMdxComponents } from "@/mdx-components";
import { mdxOptions } from "@/lib/blog/mdx-options";
import type { ResolvedAuthor } from "@/lib/blog/types";

type Props = {
  bodySecondHalf: string;
  resolvedAuthor: ResolvedAuthor;
};

export default function EndBlogPostDetails({
  bodySecondHalf,
  resolvedAuthor,
}: Props) {
  if (!bodySecondHalf) return null;
  const mdxComponents = createBlogMdxComponents({ resolvedAuthor });

  return (
    <div className="relative py-12 md:px-10 px-5">
      <div className="container mx-auto">
        <div className="flex flex-wrap lg:gap-0 gap-10">
          <div className="lg:w-1/5 md:w-1/5 sm:w-full w-full" />
          <article className="lg:w-4/5 md:w-4/5 sm:w-full w-full lg:pl-10">
            <MDXRemote source={bodySecondHalf} components={mdxComponents} options={mdxOptions} />
          </article>
        </div>
      </div>
    </div>
  );
}
