import { API_ENDPOINTS } from '@/constants/api'
import { api, RequestType } from '@/services/api';
import { VideoReviewProps } from '@/components/Impact/VideoReview/VideoReview';
import { FreqAskedQuestionsProps } from '@/components/stories/FrequentlyAskedQuestions/FrequentlyAskedQuestions';

const commonService = {
    fetchFrequentlyAskedQuestions: async (): Promise<FreqAskedQuestionsProps[]> => { 
        try {
            const response = await api({
                endpoint: API_ENDPOINTS.FreqAskedQues,
                type: RequestType.GET,
            });

            if (response?.status === 200) { 
                return response.data as FreqAskedQuestionsProps[]; 
            } else {
                throw new Error('Failed to fetch Frequently Asked Questions');
            }
        } catch (error: any) {
            console.error('Error fetching Frequently Asked Questions:', error);
            throw error; // You can handle the error more gracefully based on your needs
        }
    },
    fetchVideoReview: async (): Promise<VideoReviewProps> => {
        try {
            const response = await api({
                endpoint: API_ENDPOINTS.videoReview,
                type: RequestType.GET,
            });

            if (response?.status === 200) { 
                return response.data as VideoReviewProps; 
            } else {
                throw new Error('Failed to fetch Video Review');
            }
        } catch (error: any) {
            console.error('Error fetching Video Review:', error);
            throw error; // You can handle the error more gracefully based on your needs
        }
    },
};

export default commonService;
