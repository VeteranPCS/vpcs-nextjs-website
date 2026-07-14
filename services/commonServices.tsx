import { VideoReviewProps } from '@/components/Impact/VideoReview/VideoReview';
import { FreqAskedQuestionsProps } from '@/components/stories/FrequentlyAskedQuestions/FrequentlyAskedQuestions';
import { FREQUENTLY_ASKED_QUESTIONS, VIDEO_REVIEW } from '@/lib/content/common';

// Data now comes from the repo-committed export in content/_data/site/ via
// lib/content/common (validated at module load); the response shapes match
// the old Sanity fetches so consumers don't churn.
const commonService = {
    fetchFrequentlyAskedQuestions: async (): Promise<FreqAskedQuestionsProps[]> => {
        return FREQUENTLY_ASKED_QUESTIONS.map((faq) => ({
            _id: faq._id,
            question: faq.question,
            answer: faq.answer,
        }));
    },
    fetchVideoReview: async (): Promise<VideoReviewProps> => {
        return {
            _id: VIDEO_REVIEW._id,
            title: VIDEO_REVIEW.title,
            videoUrl: VIDEO_REVIEW.videoUrl,
        };
    },
};

export default commonService;
