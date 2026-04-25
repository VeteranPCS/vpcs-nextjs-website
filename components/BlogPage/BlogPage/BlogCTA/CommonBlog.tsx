import PcsResourcesBlog from "@/components/PcsResources/PcsResourcesBlog/PcsResourcesBlog";
import { getBlogsByComponent } from "@/lib/blog/mdx";

export default async function CommonBlog({
  component,
  limit,
}: {
  component: string;
  limit?: number;
}) {
  const blogList = await getBlogsByComponent(component, limit);
  return (
    <div className="my-5">
      <PcsResourcesBlog component={component} blogList={blogList} />
    </div>
  );
}
