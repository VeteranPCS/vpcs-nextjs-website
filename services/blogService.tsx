import { client } from '@/sanity/lib/client';
import { SanityDocument } from "@sanity/client";
import { BlogDetails } from "@/components/SearchBlog/SearchBlog";

interface BlogSlugs {
  slug: string;
}

interface ReviewDocument extends SanityDocument {
  _type: "blog";
  title: string;
  publishedAt: string;
}

const blogService = {
  fetchBlogs: async (): Promise<any> => {
    try {
      const blogs = await client.fetch<ReviewDocument[]>(`
                            *[_type == "blog"]{
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
                          `);

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
                                military_status,
                                "slug": slug.current,
                                location,
                                brokerage,
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
  SearchBlog: async (query: string): Promise<BlogDetails[]> => {
    try {
      const blogs = await client.fetch(
        `*[
          _type == "blog" &&
          (pt::text(title) match "*${query}*" || pt::text(content) match "*${query}*")
        ] | order(_createdAt desc) {
          _id,
          title,
          content,
          slug,
          publishedAt,
          mainImage {
            alt,
            asset -> {
              _id,
              url
            }
          }
        }`
      );

      if (blogs) {
        return blogs; // Handle successful response
      } else {
        // Handle error response
        throw new Error('Failed to fetch blog');
      }
    } catch (error: any) {
      console.error('Error fetching blogs:', error);
      throw error; // You can handle the error more gracefully based on your needs
    }
  },
  fetchBlogsByComponent: async (component: string) => {
    try {
      const blog = await client.fetch(
        `*[_type == "blog" && component == $component]{
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
                            }`,
        { component }
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
  }
}

export default blogService;
