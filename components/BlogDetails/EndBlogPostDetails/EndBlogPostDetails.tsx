import { MDXRemote } from "next-mdx-remote/rsc";
import { createBlogMdxComponents } from "@/mdx-components";
import { mdxOptions } from "@/lib/blog/mdx-options";
import type { ResolvedAuthor } from "@/lib/blog/types";
import type { TocHeading } from "@/lib/blog/mdx";

type Props = {
  bodySecondHalf: string;
  resolvedAuthor: ResolvedAuthor;
  headingIds: TocHeading[];
};

export default function EndBlogPostDetails({
  bodySecondHalf,
  resolvedAuthor,
  headingIds,
}: Props) {
  if (!bodySecondHalf) return null;
  const mdxComponents = createBlogMdxComponents({ resolvedAuthor, headingIds });

  return (
    <div className="relative py-12 md:px-10 px-5">
      <div className="container mx-auto">
        <div className="flex flex-col lg:flex-row lg:gap-0 gap-10">
          <div className="w-full lg:w-1/5" />
          <article className="w-full lg:w-4/5 lg:pl-10">
            <MDXRemote source={bodySecondHalf} components={mdxComponents} options={mdxOptions} />
          </article>
        </div>
      </div>
    </div>
  );
}
