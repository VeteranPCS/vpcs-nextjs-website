import { API_ENDPOINTS } from '@/constants/api'
import { api, RequestType } from '@/services/api';

const userImageServices = {
    fetchImages: async () => {
        try {
            const response = await api({
                endpoint: API_ENDPOINTS.user,
                type: RequestType.GET,
            });

            if (response?.status === 200) { 
                return response.data; 
            } else {
                throw new Error('Failed to fetch Images');
            }
        } catch (error: any) {
            console.error('Error fetching Images:', error);
            throw error; 
        }
    }
};

export default userImageServices;