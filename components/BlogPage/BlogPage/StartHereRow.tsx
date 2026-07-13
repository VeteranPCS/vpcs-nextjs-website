import BlogCard from "@/components/Blog/BlogCard/BlogCard";
import type { BlogCardData } from "@/lib/blog/cards";

type Props = {
  items: BlogCardData[];
};

/**
 * Editorial "start here" row: 3-4 pillar guides for first-time visitors.
 * The page assembles the list (pillar picks with newest-unused fallback);
 * this component only renders it.
 */
export default function StartHereRow({ items }: Props) {
  if (!items.length) return null;

  return (
    <section className="bg-[#F4F5F9] px-5 py-10">
      <div className="container mx-auto">
        <h2 className="text-[#292F6C] md:text-[42px] text-[30px] font-bold">
          Start here
        </h2>
        <p className="mt-3 max-w-2xl text-[#495057] roboto text-base leading-7">
          New to military moves or VA loans? These guides cover the basics
          before you dig into a specific base or state.
        </p>
        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {items.map((item) => (
            <div
              key={item.slug}
              className="overflow-hidden rounded-lg border border-[#E2E4E5]"
            >
              <BlogCard
                data={item}
                variant="compact"
                cta={{
                  ctaId: "blog_landing_start_here",
                  ctaPosition: "blog_landing_start_here",
                  pageType: "blog_landing",
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
