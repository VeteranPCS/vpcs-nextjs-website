import { VideoReviewProps } from '@/components/Impact/VideoReview/VideoReview';
import { FreqAskedQuestionsProps } from '@/components/stories/FrequentlyAskedQuestions/FrequentlyAskedQuestions';
import { client } from '@/sanity/lib/client'

const commonService = {
    fetchFrequentlyAskedQuestions: async (): Promise<FreqAskedQuestionsProps[]> => {
        try {
            const faqs = await client.fetch<FreqAskedQuestionsProps[]>(`*[_type == "frequently_asked_questions"]`);

            if (faqs) {
                return faqs as FreqAskedQuestionsProps[];
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
            const videoReview = await client.fetch<VideoReviewProps>(`*[_type == "video_review"][0]`);

            if (videoReview) {
                return videoReview as VideoReviewProps;
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
