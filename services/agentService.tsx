import { API_ENDPOINTS } from '@/constants/api'
import { api, RequestType } from '@/services/api';

const AgentServices = {
    fetchAgentsList: async (): Promise<Response> => {
        try {
            const response = await api({
                endpoint: API_ENDPOINTS.agents,
                type: RequestType.GET,
            });

            if (response?.status === 200) {
                return response.data;
            } else {
                throw new Error('Failed to Fetch About Page Details');
            }
        } catch (error: any) {
            console.error('Error fetching About Page Details:', error);
            throw error; // You can handle the error more gracefully based on your needs
        }
    },
};

export default AgentServices;