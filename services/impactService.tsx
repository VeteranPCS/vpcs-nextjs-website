import { API_ENDPOINTS } from '@/constants/api'
import { api, RequestType } from '@/services/api';
import { additionalStoriesProps } from '@/components/stories/optionssection/OptionsSection';
import { OurStoryProps } from '@/components/Impact/AboutOurStory/AboutOurStory';
import { WearBlueSectionProps } from '@/components/Impact/WearBlueSection/WearBlueSection';

const impactService = {
    fetchAdditionalStories: async (): Promise<additionalStoriesProps[]> => {
        try {
            const response = await api({
                endpoint: API_ENDPOINTS.additionalSuccessStories,
                type: RequestType.GET,
            });

            if (response?.status === 200) {
                return response.data as additionalStoriesProps[];
            } else {
                throw new Error('Failed to fetch Additional Impact Stories');
            }
        } catch (error: any) {
            console.error('Error fetching Additional Impact Stories:', error);
            throw error;
        }
    },
    fetchOurStory: async (): Promise<OurStoryProps> => {
        try {
            const response = await api({
                endpoint: API_ENDPOINTS.ourStory,
                type: RequestType.GET,
            });

            if (response?.status === 200) {
                return response.data as OurStoryProps;
            } else {
                throw new Error('Failed to fetch Additional Impact Stories');
            }
        } catch (error: any) {
            console.error('Error fetching Additional Impact Stories:', error);
            throw error;
        }
    },
    fetchSuccessStories: async (): Promise<WearBlueSectionProps> => {
        try {
            const response = await api({
                endpoint: API_ENDPOINTS.impact,
                type: RequestType.GET,
            });

            if (response?.status === 200) {
                return response.data as WearBlueSectionProps;
            } else {
                throw new Error('Failed to fetch Success Stories');
            }
        } catch (error: any) {
            console.error('Error fetching Success Stories:', error);
            throw error;
        }
    },
};

export default impactService;
