import { API_ENDPOINTS } from '@/constants/api'
import { api, RequestType } from '@/services/api';

const blogService = {
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
    fetchBlog: async (slug: string): Promise<Response> => {
        try {
            const response = await api({
                endpoint: `${API_ENDPOINTS.blogs}?slug=${slug}`,
                type: RequestType.GET,
            });

            if (response?.status === 200) {
                return response.data; // Handle successful response
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
