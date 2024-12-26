import { API_ENDPOINTS } from '@/constants/api'
import { api, RequestType } from '@/services/api';

const reviewService = {
    fetchReviews: async () => {
        try {
            const response = await api({
                endpoint: API_ENDPOINTS.reviews,
                type: RequestType.GET,
            });

            if (response?.status === 200) { 
                return response.data; 
            } else {
                throw new Error('Failed to fetch Reviews');
            }
        } catch (error: any) {
            console.error('Error fetching Reviews:', error);
            throw error; 
        }
    }
};

export default reviewService;