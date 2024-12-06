import { API_ENDPOINTS } from '@/constants/api'

const blogService = {
    fetchBlogs: async (): Promise<Response> => {
        const response = await fetch(API_ENDPOINTS.blogs);
        return response;
    },
    fetchBlog: async (slug: string): Promise<Response> => {  // Explicitly typing `slug` as `string`
        console.log(slug)
        const response = await fetch(`${API_ENDPOINTS.blogs}?slug=${slug}`);
        return response;
    },
};

export default blogService;
