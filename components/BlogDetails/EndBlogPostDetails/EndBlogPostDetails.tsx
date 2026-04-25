import "@/app/globals.css";
import { MDXRemote } from "next-mdx-remote/rsc";
import { mdxComponents } from "@/mdx-components";

type Props = {
  bodySecondHalf: string;
};

export default function EndBlogPostDetails({ bodySecondHalf }: Props) {
  if (!bodySecondHalf) return null;
  return (
    <div className="relative py-12 md:px-10 px-5">
      <div className="container mx-auto">
        <div className="flex flex-wrap lg:gap-0 gap-10">
          <div className="lg:w-1/5 md:w-1/5 sm:w-full w-full" />
          <article className="lg:w-4/5 md:w-4/5 sm:w-full w-full lg:pl-10">
            <MDXRemote source={bodySecondHalf} components={mdxComponents} />
          </article>
        </div>
      </div>
    </div>
  );
}
