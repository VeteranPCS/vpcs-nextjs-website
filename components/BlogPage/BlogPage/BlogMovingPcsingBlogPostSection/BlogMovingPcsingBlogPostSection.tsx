import "@/app/globals.css";
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
              <h1 className="text-[#292F6C] tahoma lg:text-[36px] md:text-[36px] text-[26px] font-bold">
                {component}
              </h1>
              <BlogCategory categories_list={categories_list} />
            </div>
          </div>
          <div>
            <BlogSearchForm id="blog-section-search-query" className="justify-center mt-6 w-[312px] md:inline-flex sm:hidden" />
            <div className="sm:flex justify-end mt-5 hidden">
            </div>
          </div>
        </div>
        <div className="grid lg:grid-cols-4 md:grid-cols-3 sm:grid-cols-1 grid-cols-1 justify-center xl:gap-10 lg:gap-10 md:gap-10 sm:gap-2 gap-2 ">
          {blogList?.map((blog) => (
            <BlogMovingPcsingPost key={blog.slug} blogDetails={blog} />
          ))}
        </div>
        <div className="flex justify-end mt-5 sm:hidden ">
          <TrackedCtaLink
            href={categoryHref}
            className="text-[#292F6C] robot text-sm font-bold "
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
