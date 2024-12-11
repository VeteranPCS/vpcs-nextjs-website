import { API_ENDPOINTS } from '@/constants/api'

const AgentServices = {
    fetchAgentsList: async () => {
        const response = await fetch(API_ENDPOINTS.agents);
        return response;
    }
};

export default AgentServices;