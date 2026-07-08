import classes from "./PcsResourcesBlog.module.css";
import { formatDate } from "@/utils/helper";
import { excerpt } from "@/lib/blog/mdx";
import type { BlogPost } from "@/lib/blog/types";
import { normalizeBlogComponentSlug } from "@/lib/blog/components";
import TrackedCtaLink from "@/components/common/TrackedCtaLink";

type Props = {
  blogList: BlogPost[];
  component: string;
};

export default function PcsResourcesBlog({ blogList, component }: Props) {
  const componentSlug = normalizeBlogComponentSlug(component);
  const categoryHref = componentSlug ? `/blog/category/${componentSlug}` : "/blog";

  return (
    <div className="py-6 px-5" id={component}>
      <div className="container mx-auto">
        <div className="flex flex-wrap gap-5 items-end md:justify-between justify-center">
          <div className="md:text-left text-center">
            <h2 className="text-[#292F6C] md:text-[42px] text-[30px] font-bold md:text-left text-center">
              {component}
            </h2>
          </div>
          <TrackedCtaLink
            href={categoryHref}
            className="text-[#292F6C] roboto text-sm font-bold"
            cta={{
              ctaId: 'pcs_resources_blog_view_all',
              ctaIntent: 'content_navigation',
              ctaPosition: 'pcs_resources_blog_header',
              ctaComponent: 'pcs_resources_blog',
              ctaLabel: 'View All',
              destination: categoryHref,
              pageType: 'pcs_resources',
              contentType: 'blog_category',
            }}
          >
            View All
          </TrackedCtaLink>
        </div>
        <div
          className={`grid ${blogList.length === 1
            ? "lg:grid-cols-1"
            : blogList.length === 2
              ? "lg:grid-cols-2"
              : "lg:grid-cols-3"
            } md:grid-cols-2 sm:grid-cols-1 grid-cols-1 gap-6 mt-10`}
        >
          {blogList.map((blog) => {
            const bg = blog.mainImage?.src ?? "/assets/blogctabgimage.png";
            return (
              <TrackedCtaLink
                href={blog.slug ? `/blog/${blog.slug}` : "/blog"}
                key={blog.slug}
                className={classes.blogimageone}
                style={{ backgroundImage: `url("${bg}")` }}
                cta={{
                  ctaId: 'pcs_resources_blog_card',
                  ctaIntent: 'content_navigation',
                  ctaPosition: 'pcs_resources_blog_grid',
                  ctaComponent: 'pcs_resources_blog',
                  ctaLabel: 'Read guide',
                  destination: blog.slug ? `/blog/${blog.slug}` : "/blog",
                  pageType: 'pcs_resources',
                  contentSlug: blog.slug,
                  contentType: 'blog_post',
                }}
              >
                <div className="flex items-center absolute top-4 right-4 gap-2 flex-wrap max-w-[calc(100%-2rem)] justify-end">
                  {blog.categories?.map((category) => (
                    <div
                      key={category}
                      className="rounded-lg bg-white/15 px-4 py-2 text-white roboto text-xs font-bold"
                    >
                      {category}
                    </div>
                  ))}
                </div>
                <div className="absolute bottom-4 left-2 px-6 py-1 max-w-[calc(100%-1rem)]">
                  <p className="text-[#E5E5E5] md:text-[14px] text-[12px] font-normal leading-normal">
                    {formatDate(blog.publishedAt)}
                  </p>
                  <h3 className="text-white md:text-[21px] text-[15px] font-bold my-3 line-clamp-2">
                    {blog.title}
                  </h3>
                  <p className="text-[#E5E5E5] roboto text-[14px] font-normal lg:max-w-[370px] line-clamp-3">
                    {excerpt(blog.content, 250)}
                  </p>
                </div>
              </TrackedCtaLink>
            );
          })}
        </div>
      </div>
    </div>
  );
}
