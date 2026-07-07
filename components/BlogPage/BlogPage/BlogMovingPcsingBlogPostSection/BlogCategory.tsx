"use client";

import TrackedCtaLink from "@/components/common/TrackedCtaLink";
import { normalizeBlogComponentSlug } from "@/lib/blog/components";

const BlogCategory = ({ categories_list }: { categories_list: Set<string> }) => {
    return (
        <div className="flex flex-wrap items-center md:gap-10 sm:gap-5 gap-4 mt-5">
                {Array.from(categories_list).map((category) => {
                    const slug = normalizeBlogComponentSlug(category);
                    return (
                    <TrackedCtaLink
                        key={category}
                        href={slug ? `/blog/category/${slug}` : "/blog"}
                        className="text-[#292F6C] roboto text-sm font-normal inline-flex items-center min-h-11"
                        cta={{
                            ctaId: 'blog_category_filter',
                            ctaIntent: 'content_navigation',
                            ctaPosition: 'blog_category_filter',
                            ctaComponent: 'blog_category_links',
                            ctaLabel: category,
                            destination: slug ? `/blog/category/${slug}` : "/blog",
                            pageType: 'blog_landing',
                            contentType: 'blog_category',
                        }}
                    >
                        {category}
                    </TrackedCtaLink>
                    );
                })}
        </div>
    );
};

export default BlogCategory;
