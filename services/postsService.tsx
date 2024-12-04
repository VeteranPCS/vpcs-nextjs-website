import { API_ENDPOINTS } from '@/app/constants/api'

const postsService = {
    fetchPosts: async () => {
        // const id = 'Hello World';
        // const response = await fetch(`${API_ENDPOINTS.posts}?id=${id}`)
        const response = await fetch(API_ENDPOINTS.posts);
        return response;
    }
};

export default postsService;