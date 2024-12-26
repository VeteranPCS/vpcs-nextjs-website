import { API_ENDPOINTS } from '@/constants/api'
import { api, RequestType } from '@/services/api';
import { MediaAccountProps } from '@/components/homepage/KeepInTouch/KeepInTouch';

const mediaAccountService = {
    fetchAccounts: async (): Promise<MediaAccountProps[]> => {
        try {
            const response = await api({
                endpoint: API_ENDPOINTS.accounts,
                type: RequestType.GET,
            });

            if (response?.status === 200) {
                return response.data as MediaAccountProps[];
            } else {
                throw new Error('Failed to fetch Internship Benefits');
            }
        } catch (error: any) {
            console.error('Error fetching Internship Benefits:', error);
            throw error;
        }
    }
};

export default mediaAccountService;
