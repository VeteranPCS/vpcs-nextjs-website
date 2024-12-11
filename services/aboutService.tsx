import { API_ENDPOINTS } from '@/constants/api'

const aboutService = {
    fetchMembersDetail: async (roles: string): Promise<Response> => { 
        const response = await fetch(`${API_ENDPOINTS.members}?roles=${roles}`);
        return response;
    },
    fetchOverviewDetails: async(component: string): Promise<Response> => {
        const response = await fetch(`${API_ENDPOINTS.aboutUsOverview}?component=${component}`);
        return response
    },
    fetchSupportComponent: async(): Promise<Response> => {
        const response = await fetch(`${API_ENDPOINTS.aboutUsSupport}`);
        return response
    },
};

export default aboutService;
