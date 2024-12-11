import { API_ENDPOINTS } from '@/constants/api'

const mediaAccountService = {
    fetchAccounts: async (): Promise<Response> => {
        const response = await fetch(API_ENDPOINTS.accounts);
        return response;
    }
};

export default mediaAccountService;
