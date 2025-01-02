import PcsResourcesBlog from "@/components/PcsResources/PcsResourcesBlog/PcsResourcesBlog";
import blogService from "@/services/blogService";

export interface BlogDetails {
    _id: string;
    title: string;
    content: any[]; // Consider creating a more specific type for the content structure
    _createdAt: string;
    slug: { current: string };
    mainImage: { image_url: string; alt: string };
    categories: Category[];
    author: Author;
    component: string;  // Added field for grouping by component
    publishedAt: string;  // Added field for sorting blogs
}

export interface Author {
    name: string;
    image: string;
    designation: string;
}

export interface Category {
    _id: string;
    title: string;
}

const CommonBlog = async ({ component }: { component: string }) => {
    let blogList: BlogDetails[] = [];

    try {
        blogList = await blogService.fetchBlogsByComponent(component);
    } catch (error) {
        console.error("Error fetching blogs", error);
    }

    return (
        <div className="my-5">
            <PcsResourcesBlog component={component} blogList={blogList} />
        </div>
    );
};

export default CommonBlog;