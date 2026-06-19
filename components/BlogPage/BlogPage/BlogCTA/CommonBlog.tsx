import PcsResourcesBlog from "@/components/PcsResources/PcsResourcesBlog/PcsResourcesBlog";
import { getAllBlogs } from "@/lib/blog/mdx";
import { resolveBlogStateSlug } from "@/lib/blog/state";

export default async function CommonBlog({
  component,
  currentSlug,
  stateSlug,
  categories = [],
  primaryKeyword,
  limit = 3,
}: {
  component: string;
  currentSlug?: string;
  stateSlug?: string | null;
  categories?: string[];
  primaryKeyword?: string | null;
  limit?: number;
}) {
  const categorySet = new Set(categories);
  const allBlogs = await getAllBlogs();
  const blogList = allBlogs
    .filter((blog) => !currentSlug || blog.slug !== currentSlug)
    .map((blog) => {
      let score = 0;
      if (component && blog.component === component) score += 3;
      const candidateState = resolveBlogStateSlug(blog);
      if (stateSlug && candidateState === stateSlug) score += 4;
      if (primaryKeyword && blog.primaryKeyword === primaryKeyword) score += 2;
      score += (blog.categories ?? []).filter((category) => categorySet.has(category)).length;
      return { blog, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || new Date(b.blog.publishedAt).getTime() - new Date(a.blog.publishedAt).getTime())
    .slice(0, limit)
    .map(({ blog }) => blog);

  if (blogList.length === 0) return null;

  return (
    <div className="my-5">
      <PcsResourcesBlog component={component} blogList={blogList} />
    </div>
  );
}
