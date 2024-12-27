import { API_ENDPOINTS } from '@/constants/api'
import { api, RequestType } from '@/services/api';
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
    fetchBlogSlugs: async (): Promise<BlogSlugs[]> => {
        try {
            const response = await client.fetch(`*[_type == "blog"]{ "slug": slug.current }`);
            if (response) {
                return response;
            } else {
                throw new Error('Failed to fetch blog slugs');
            }
        } catch (error: any) {
            console.error('Error fetching blog slugs:', error);
            throw error;
        }
    },
    fetchBlogs: async (category: string): Promise<any> => {
        try {
            const response = await api({
                endpoint: `${API_ENDPOINTS.blogs}?category=${category}`,
                type: RequestType.GET,
            });

            if (response?.status === 200) {
                return response.data;
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
            console.log("Fetching blog with slug:", slug);
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
