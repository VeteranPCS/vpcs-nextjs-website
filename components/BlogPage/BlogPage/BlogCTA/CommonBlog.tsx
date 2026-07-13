import PcsResourcesBlog from "@/components/PcsResources/PcsResourcesBlog/PcsResourcesBlog";
import BlogCardRail from "@/components/Blog/BlogCard/BlogCardRail";
import { componentSlugForBlog, getAllBlogs, getBlogsByComponent } from "@/lib/blog/mdx";
import { getBlogComponentBySlug } from "@/lib/blog/components";
import { pickRelated, rankRelatedBlogs } from "@/lib/blog/related";
import { toBlogCardData } from "@/lib/blog/cards";
import type { BlogPost } from "@/lib/blog/types";

export default async function CommonBlog({
  component,
  blog,
  excludeSlugs = [],
  limit = 3,
}: {
  component: string;
  // Current post. When set, renders the ranked "Keep reading" related rail
  // instead of the component rail.
  blog?: BlogPost;
  excludeSlugs?: string[];
  limit?: number;
}) {
  if (blog) {
    const allBlogs = await getAllBlogs();
    const ranked = rankRelatedBlogs(allBlogs, blog);
    const related = pickRelated(ranked, { limit: 6, crossComponentMin: 2, excludeSlugs });
    if (related.length === 0) return null;

    const blogComponent = getBlogComponentBySlug(componentSlugForBlog(blog));

    return (
      <div className="my-5">
        <BlogCardRail
          items={related.map(toBlogCardData)}
          heading="Keep reading"
          headingHref={blogComponent ? `/blog/category/${blogComponent.slug}` : "/blog"}
          headingLinkLabel={
            blogComponent ? `View all ${blogComponent.label} guides` : "View all guides"
          }
          cta={{
            ctaId: "blog_related_card",
            ctaPosition: "blog_post_related_rail",
            pageType: "blog_post",
          }}
        />
      </div>
    );
  }

  // Component-rail mode (va-loan-help, thank-you, pcs-resources callers).
  // Matches the old inline scoring for component-only input: same-component
  // posts, newest first.
  const blogList = await getBlogsByComponent(component, limit);
  if (blogList.length === 0) return null;

  return (
    <div className="my-5">
      <PcsResourcesBlog component={component} blogList={blogList} />
    </div>
  );
}
