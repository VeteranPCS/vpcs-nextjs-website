import { API_ENDPOINTS } from '@/constants/api'

const impactService = {
    fetchAdditionalStories: async (): Promise<Response> => {
        const response = await fetch(API_ENDPOINTS.additionalSuccessStories);
        return response;
    },
    fetchOurStory: async (): Promise<Response> => {
        const response = await fetch(API_ENDPOINTS.ourStory);
        return response;
    },
    fetchSuccessStories: async (): Promise<Response> => {
        const response = await fetch(API_ENDPOINTS.impact);
        return response;
    },
};

export default impactService;
