import { API_ENDPOINTS } from '@/constants/api'

const internshipPageService = {
    fetchActionItem: async (): Promise<Response> => {
        const response = await fetch(API_ENDPOINTS.fetchActionItem);
        return response;
    },
    fetchInternshipBenefits: async (): Promise<Response> => {
        const response = await fetch(API_ENDPOINTS.fetchInternshipBenefits);
        return response;
    },
    fetchInternshipOffer: async (): Promise<Response> => {
        const response = await fetch(API_ENDPOINTS.fetchInternshipOffer);
        return response;
    },
};

export default internshipPageService;
