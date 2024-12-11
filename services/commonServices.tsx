import { API_ENDPOINTS } from '@/constants/api'

const commonService = {
    fetchFrequentlyAskedQuestions: async (): Promise<Response> => { 
        const response = await fetch(`${API_ENDPOINTS.FreqAskedQues}`);
        return response;
    },
    fetchVideoReview: async (): Promise<Response> => {
        const response = await fetch(API_ENDPOINTS.videoReview);
        return response;
    },
};

export default commonService;
