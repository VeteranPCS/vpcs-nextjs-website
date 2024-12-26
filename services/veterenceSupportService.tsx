import { API_ENDPOINTS } from '@/constants/api'
import { api, RequestType } from '@/services/api';
import { VeteranCommunityProps } from '@/components/homepage/VeteranCommunity/VeteranCommunity';

const veterenceSupportService = {
    fetchVeterenceSupport: async (slug: string): Promise<VeteranCommunityProps> => {
        try {
            const response = await api({
                endpoint: `${API_ENDPOINTS.veterence}?slug=${slug}`,
                type: RequestType.GET,
            });

            if (response?.status === 200) { 
                return response.data as VeteranCommunityProps; 
            } else {
                throw new Error('Failed to fetch Veterence Support Data');
            }
        } catch (error: any) {
            console.error('Error fetching Veterence Support Data:', error);
            throw error; 
        }
    }
};

export default veterenceSupportService;