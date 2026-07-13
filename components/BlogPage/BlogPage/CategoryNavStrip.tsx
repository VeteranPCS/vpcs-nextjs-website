import TrackedCtaLink from "@/components/common/TrackedCtaLink";

export type CategoryNavItem = {
  slug: string;
  label: string;
  count: number;
};

type Props = {
  items: CategoryNavItem[];
};

/**
 * Sticky category chip strip under the blog hero. Server component; the
 * stickiness is pure CSS (offset clears the fixed site header: 64px mobile,
 * 80px desktop). Scrolls horizontally on small screens.
 */
export default function CategoryNavStrip({ items }: Props) {
  if (!items.length) return null;

  return (
    <nav
      aria-label="Blog categories"
      className="sticky top-[64px] lg:top-[80px] z-40 border-b border-[#E2E4E5] bg-white px-5"
    >
      <div className="container mx-auto">
        <ul className="flex items-center gap-3 overflow-x-auto py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {items.map((item) => (
            <li key={item.slug} className="shrink-0">
              <TrackedCtaLink
                href={`/blog/category/${item.slug}`}
                className="inline-flex min-h-11 items-center gap-2 rounded-custom border border-[#E2E4E5] px-4 py-2 roboto text-sm font-bold text-[#292F6C] hover:border-[#292F6C]"
                cta={{
                  ctaId: "blog_landing_category_nav",
                  ctaIntent: "content_navigation",
                  ctaPosition: "blog_landing_nav_strip",
                  ctaComponent: "blog_category_nav_strip",
                  ctaLabel: item.label,
                  destination: `/blog/category/${item.slug}`,
                  pageType: "blog_landing",
                }}
              >
                {item.label}
                <span className="font-normal text-[#6C757D]">{item.count}</span>
              </TrackedCtaLink>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
