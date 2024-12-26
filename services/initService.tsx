import { API_ENDPOINTS } from '@/constants/api'
import { api, RequestType } from '@/services/api';

const initService = {
    getStateList: async () => {
        try {
            const response = await api({
                endpoint: API_ENDPOINTS.fetchStateList,
                type: RequestType.GET,
            });

            if (response?.status === 200) {
                return response.data;
            } else {
                throw new Error('Failed to fetch Additional Impact Stories');
            }
        } catch (error: any) {
            console.error('Error fetching Additional Impact Stories:', error);
            throw error;
        }
    },
};

export default initService;
