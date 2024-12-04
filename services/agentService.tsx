import { API_ENDPOINTS } from '@/app/constants/api'

const AgentServices = {
    fetchAgentsList: async () => {
        // const id = 'Hello World';
        // const response = await fetch(`${API_ENDPOINTS.posts}?id=${id}`)
        const response = await fetch(API_ENDPOINTS.agents);
        return response;
    }
};

export default AgentServices;