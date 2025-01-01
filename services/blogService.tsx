import { client } from '@/sanity/lib/client';
import { SanityDocument } from "@sanity/client";

interface BlogSlugs {
    slug: string;
}

interface ReviewDocument extends SanityDocument {
    _type: "blog";
    title: string;
    publishedAt: string;
}

const blogService = {
    fetchBlogs: async (category: string): Promise<any> => {
        try {
            const blogs = await client.fetch<ReviewDocument[]>(`
                            *[_type == "blog" && component_slug.current == $category]{
                              ...,
                              mainImage{
                                ...,
                                "image_url": asset->url // Directly fetch the main image URL
                              },
                              author->{
                                _id,
                                name,
                                designation,
                                "image": image.asset->url // Fetch author's image URL
                              },
                              categories[]->{
                                _id,
                                title
                              }
                            }
                          `, { category });

            if (blogs) {
                return blogs;
            } else {
                throw new Error('Failed to fetch blog');
            }
        } catch (error: any) {
            console.error('Error fetching blogs:', error);
            throw error; // You can handle the error more gracefully based on your needs
        }
    },
    fetchBlog: async (slug: string): Promise<ReviewDocument> => {
        try {
            const blog = await client.fetch<ReviewDocument>(
                `*[_type == "blog" && slug.current == $slug]{
                              ...,
                              mainImage{
                                ...,
                                "image_url": asset->url // Directly fetch the main image URL
                              },
                              author->{
                                _id,
                                name,
                                designation,
                                "image": image.asset->url // Fetch author's image URL
                              },
                              categories[]->{
                                _id,
                                title
                              }
                            }[0]`,
                { slug }
            );
            if (blog) {
                return blog; // Handle successful response
            } else {
                // Handle error response
                throw new Error('Failed to fetch blog');
            }
        } catch (error: any) {
            console.error('Error fetching blogs:', error);
            throw error; // You can handle the error more gracefully based on your needs
        }
    },
};

export default blogService;
