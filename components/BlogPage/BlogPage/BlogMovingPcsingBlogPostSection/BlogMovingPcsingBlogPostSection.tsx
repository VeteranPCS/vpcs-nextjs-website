import BlogMovingPcsingPost from "@/components/BlogPage/BlogPage/BlogMovingPcsingBlogPostSection/BlogMovingPcsingPost";
import BlogCategory from "@/components/BlogPage/BlogPage/BlogMovingPcsingBlogPostSection/BlogCategory";
import type { BlogPost } from "@/lib/blog/types";
import BlogSearchForm from "@/components/BlogPage/BlogSearchForm";
import { normalizeBlogComponentSlug } from "@/lib/blog/components";
import TrackedCtaLink from "@/components/common/TrackedCtaLink";

type Props = {
  blogList: BlogPost[];
  component: string;
  categories_list: Set<string>;
};

export default async function BlogMovingPcsingBlogPostSection({
  blogList,
  component,
  categories_list,
}: Props) {
  const componentSlug = normalizeBlogComponentSlug(component);
  const categoryHref = componentSlug ? `/blog/category/${componentSlug}` : "/blog";

  return (
    <div className="relative py-12 md:px-0 px-5" id={component}>
      <div className="container mx-auto">
        <div className="flex justify-between items-center flex-wrap">
          <div>
            <div>
              <h2 className="text-[#292F6C] tahoma md:text-[36px] text-[26px] font-bold">
                {component}
              </h2>
              <BlogCategory categories_list={categories_list} />
            </div>
          </div>
          <div>
            <BlogSearchForm id="blog-section-search-query" className="hidden md:inline-flex justify-center mt-6" />
          </div>
        </div>
        <div className="grid lg:grid-cols-4 md:grid-cols-3 grid-cols-1 justify-center md:gap-10 gap-2">
          {blogList?.map((blog) => (
            <BlogMovingPcsingPost key={blog.slug} blogDetails={blog} />
          ))}
        </div>
        <div className="flex justify-end mt-5 sm:hidden ">
          <TrackedCtaLink
            href={categoryHref}
            className="text-[#292F6C] roboto text-sm font-bold inline-flex items-center min-h-11"
            cta={{
              ctaId: 'blog_section_view_all',
              ctaIntent: 'content_navigation',
              ctaPosition: 'blog_section_footer',
              ctaComponent: 'blog_section',
              ctaLabel: 'View All',
              destination: categoryHref,
              pageType: 'blog_landing',
              contentType: 'blog_category',
            }}
          >
            View All
          </TrackedCtaLink>
        </div>
      </div>
    </div>
  );
}
