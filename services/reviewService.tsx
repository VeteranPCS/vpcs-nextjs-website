import { client } from '@/sanity/lib/client'
import { SanityDocument } from '@sanity/client'
import { urlForImage } from '@/sanity/lib/image'
import { Review } from '@/components/homepage/ReviewTestimonial/ReviewTestimonial'
interface ReviewDocument extends Review {
    user_logo: {
        asset: {
            _ref: string
            image_url: string
        }
    }
}

const reviewService = {
    fetchReviews: async () => {
        try {
            const reviews = await client.fetch<ReviewDocument[]>(`*[_type == "review"]`)

            reviews.forEach((review) => {
                if (review.user_logo?.asset?._ref) {
                    review.user_logo.asset.image_url = urlForImage(review.user_logo.asset);  // Add the image URL to the response
                }
            })

            if (reviews) {
                return reviews;
            } else {
                throw new Error('Failed to fetch Reviews');
            }
        } catch (error: any) {
            console.error('Error fetching Reviews:', error);
            throw error;
        }
    }
};

export default reviewService;