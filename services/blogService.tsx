import { API_ENDPOINTS } from '@/app/constants/api'

const blogService = {
    fetchBlogs: async () => {
        // const id = 'Hello World';
        // const response = await fetch(`${API_ENDPOINTS.posts}?id=${id}`)
        const response = await fetch(API_ENDPOINTS.blogs);
        return response;
    },
    fetchBlog: async (slug) => {
        console.log(slug)
        const response = await fetch(`${API_ENDPOINTS.blogs}?slug=${slug}`);
        return response;
    },
};

export default blogService;