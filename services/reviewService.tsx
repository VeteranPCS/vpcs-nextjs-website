import { RequestType, googleReviewsAPI } from '@/services/api';
import { Review } from '@/components/homepage/ReviewTestimonial/ReviewTestimonial'
import { getGoogleAuthToken } from "@/services/salesForceTokenService";

interface ReviewDocument extends Review {
    user_logo: {
        asset: {
            _ref: string
            image_url: string
        }
    }
}

const reviewService = {
    fetchReviews: async (): Promise<Review[]> => {
        try {
            const response = await googleReviewsAPI({
                endpoint: `https://mybusiness.googleapis.com/v4/accounts/${process.env.GOOGLE_REVIEWS_ACCOUNT_ID}/locations/${process.env.LOCATION_ID}/reviews`,
                type: RequestType.GET,
            });

            if (response?.status === 200) {
                console.log("response: ", response);
                console.log("response.data: ", response.data);
                return response.data.reviews as Review[];
            } else if (response?.status === 401) {
                // Token expired: Refresh and retry
                try {
                    await getGoogleAuthToken(); // Refresh token
                    return await reviewService.fetchReviews(); // Retry the request
                } catch (tokenError) {
                    console.error("Failed to refresh token:", tokenError);
                    throw tokenError;
                }
            } else {
                throw new Error("Failed to fetch Google api Reviews");
            }

            // const reviews = await import('@/public/json/reviews.json');
            // return reviews.reviews as Review[];
        } catch (error: any) {
            console.error('Error fetching Reviews:', error);
            throw error;
        }
    }
};

export default reviewService;