import { API_ENDPOINTS } from '@/app/constants/api'

const userImageServices = {
    fetchImages: async () => {
        // const id = 'Hello World';
        // const response = await fetch(`${API_ENDPOINTS.posts}?id=${id}`)
        const response = await fetch(API_ENDPOINTS.user);
        return response;
    }
};

export default userImageServices;