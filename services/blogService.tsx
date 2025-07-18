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

interface Author extends SanityDocument {
  _type: "author";
  _id: string;
}

const blogService = {
  fetchBlogs: async (): Promise<any> => {
    try {
      const logo_url = await client.fetch<ReviewDocument[]>(`
        *[_type == "veterence_logo"]{
          logo{
            "image_url": asset->url // Directly fetch the main image URL
          },
        }
      `);

      const blogs = await client.fetch<ReviewDocument[]>(`
                            *[_type == "blog" && is_show == true && publishedAt <= now()] | order(_publishedAt desc) {
                              ...,
                              mainImage{
                                ...,
                                "image_url": asset->url // Directly fetch the main image URL
                              },
                              author->{
                                _id,
                                name,
                                military_status,
                                "image": image.asset->url // Fetch author's image URL
                              },
                              categories[]->{
                                _id,
                                title
                              }
                            }
                          `);

      if (blogs) {
        blogs.map((blog: any) => {
          blog.logo = logo_url[0].logo.image_url;
        });

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
      const logo_url = await client.fetch<ReviewDocument[]>(`
        *[_type == "veterence_logo"]{
          logo{
            "image_url": asset->url // Directly fetch the main image URL
          },
        }
      `);

      const blog = await client.fetch<ReviewDocument>(
        `*[_type == "blog" && slug.current == $slug && publishedAt <= now()]{
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
        blog.logo = logo_url[0].logo.image_url;
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
      const logo_url = await client.fetch<ReviewDocument[]>(`
        *[_type == "veterence_logo"]{
          logo{
            "image_url": asset->url // Directly fetch the main image URL
          },
        }
      `);

      const blogs = await client.fetch(
        `*[
          _type == "blog" &&
          publishedAt <= now() &&
          (pt::text(title) match "*${query}*" || pt::text(content) match "*${query}*")
        ] | order(_publishedAt desc) {
          _id,
          title,
          content,
          short_title,
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
        blogs.map((blog: any) => {
          blog.logo = logo_url[0].logo.image_url;
        });

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
  fetchBlogsByComponent: async (component: string, limit?: number) => {
    try {
      const logo_url = await client.fetch<ReviewDocument[]>(`
        *[_type == "veterence_logo"]{
          logo{
            "image_url": asset->url // Directly fetch the main image URL
          },
        }
      `);

      const query = `*[_type == "blog" && component == $component && publishedAt <= now()]|order(publishedAt desc)${typeof limit === 'number' ? `[0...${limit}]` : ''}{
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
                              }`;

      const blog = await client.fetch(
        query,
        { component }
      );
      if (blog) {
        blog.map((blo: any) => {
          blo.logo = logo_url[0].logo.image_url;
        });

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
  fetchBlogSlugs: async (): Promise<BlogSlugs[]> => {
    try {
      const blogSlugs = await client.fetch<BlogSlugs[]>(`
                            *[_type == "blog" && publishedAt <= now()]{
                              "slug": slug.current
                            }
                          `);

      if (blogSlugs) {
        return blogSlugs;
      } else {
        throw new Error('Failed to fetch blog');
      }
    } catch (error: any) {
      console.error('Error fetching blogs:', error);
      throw error; // You can handle the error more gracefully based on your needs
    }
  },
  fetchBlogsByAuthor: async (author: string) => {
    try {
      const blogSlugs = await client.fetch(`
        *[_type == "blog" && author._ref == $author && publishedAt <= now()]{
          "slug": slug.current
        }
        `,
        { author });
      if (blogSlugs) {
        return blogSlugs;
      } else {
        throw new Error(`Failed to fetch blog for author: ${author}`);
      }
    } catch (error: any) {
      console.error('Error fetching blogs by author:', error);
      throw error; // You can handle the error more gracefully based
    }
  },
}

export default blogService;
