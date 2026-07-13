import BlogCard, { type BlogCardVariant } from "./BlogCard";
import TrackedCtaLink from "@/components/common/TrackedCtaLink";
import type { BlogCardCtaContext, BlogCardData } from "@/lib/blog/cards";

type Props = {
  items: BlogCardData[];
  cta: BlogCardCtaContext;
  variant?: BlogCardVariant;
  heading?: string;
  headingHref?: string;
  headingLinkLabel?: string;
  // Taxonomy docs name some view-all ids explicitly (e.g. blog_landing_rail_view_all);
  // set this when the derived `${cta.ctaId}_view_all` doesn't match the doc.
  viewAllCtaId?: string;
};

export default function BlogCardRail({
  items,
  cta,
  variant = "default",
  heading,
  headingHref,
  headingLinkLabel = "View All",
  viewAllCtaId,
}: Props) {
  if (!items.length) return null;

  return (
    <div className="py-6 px-5">
      <div className="container mx-auto">
        {heading || headingHref ? (
          <div className="flex flex-wrap gap-5 items-end md:justify-between justify-center mb-10">
            {heading ? (
              <h2 className="text-[#292F6C] md:text-[42px] text-[30px] font-bold md:text-left text-center">
                {heading}
              </h2>
            ) : null}
            {headingHref ? (
              <TrackedCtaLink
                href={headingHref}
                className="text-[#292F6C] roboto text-sm font-bold"
                cta={{
                  ctaId: viewAllCtaId ?? `${cta.ctaId}_view_all`,
                  ctaIntent: "content_navigation",
                  ctaPosition: cta.ctaPosition,
                  ctaComponent: "blog_card_rail",
                  ctaLabel: headingLinkLabel,
                  destination: headingHref,
                  pageType: cta.pageType,
                  ctaLocation: cta.ctaLocation,
                }}
              >
                {headingLinkLabel}
              </TrackedCtaLink>
            ) : null}
          </div>
        ) : null}
        {/* Below md the rail scrolls horizontally instead of stacking; stacked
            rails were the main driver of the /blog mobile page-height budget. */}
        <div
          className={`flex gap-6 overflow-x-auto snap-x pb-2 md:grid md:overflow-visible md:pb-0 md:grid-cols-2 ${items.length === 1
            ? "lg:grid-cols-1"
            : items.length === 2
              ? "lg:grid-cols-2"
              : "lg:grid-cols-3"
            }`}
        >
          {items.map((item) => (
            <div
              key={item.slug}
              className="w-[85%] max-w-[320px] shrink-0 snap-start md:w-auto md:max-w-none"
            >
              <BlogCard data={item} variant={variant} cta={cta} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
