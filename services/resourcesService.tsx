import { API_ENDPOINTS } from '@/constants/api'
import { api, RequestType } from '@/services/api';

const blogService = {
    fetchLifeResources: async (): Promise<any> => {
        try {
            const response = await api({
                endpoint: API_ENDPOINTS.fetchLifeResources,
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
    fetchTrustedResources: async (): Promise<any> => {
        try {
            const response = await api({
                endpoint: API_ENDPOINTS.fetchTrustedSources,
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
};

export default blogService;
