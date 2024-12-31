import { client } from '@/sanity/lib/client';

const initService = {
    getStateListFetch: async () => {
        try {
            const response = await client.fetch(`*[_type == "city_list"]{ city_name, short_name }`)

            if (response) {
                return response;
            } else {
                throw new Error('Failed to fetch State List');
            }
        } catch (error: any) {
            console.error('Error fetching State List:', error);
            throw error;
        }
    },
};

export default initService;
