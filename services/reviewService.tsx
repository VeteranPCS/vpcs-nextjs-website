import { API_ENDPOINTS } from '@/app/constants/api'

const reviewService = {
    fetchReviews: async () => {
        // const id = 'Hello World';
        // const response = await fetch(`${API_ENDPOINTS.posts}?id=${id}`)
        const response = await fetch(API_ENDPOINTS.reviews);
        return response;
    }
};

export default reviewService;