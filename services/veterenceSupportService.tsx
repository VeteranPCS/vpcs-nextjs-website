import { API_ENDPOINTS } from '@/constants/api'

const veterenceSupportService = {
    fetchVeterenceSupport: async (slug: string) => {
        // const id = 'Hello World';
        // const response = await fetch(`${API_ENDPOINTS.posts}?id=${id}`)
        const response = await fetch(`${API_ENDPOINTS.veterence}?slug=${slug}`);
        return response;
    }
};

export default veterenceSupportService;