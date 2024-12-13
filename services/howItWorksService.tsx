import { API_ENDPOINTS } from '@/constants/api'

const howItWorksService = {
    fetchHowVeterencePCSWorks: async (): Promise<Response> => {
        const response = await fetch(API_ENDPOINTS.howVeterencePCSServiceWorks);
        return response;
    },
};

export default howItWorksService;
