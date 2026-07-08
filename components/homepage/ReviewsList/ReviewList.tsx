import Script from "next/script";
import ReviewTestimonial from "@/components/homepage/ReviewTestimonial/ReviewTestimonial";
import { Review } from "@/components/homepage/ReviewTestimonial/ReviewTestimonial";
import { WithContext, Review as Testimonial, AggregateRating, Organization } from "schema-dts";
import { fetchGoogleReviews } from "@/utils/googleBusinessProfile";

// Add interface for the reviews data structure
interface ReviewsData {
    reviews: Review[];
    averageRating: number;
    totalReviewCount: number;
}

export default async function ReviewsList() {
    let reviewsData: ReviewsData | null = null;

    try {
        reviewsData = await fetchGoogleReviews();
    } catch (error: any) {
        if (error?.digest) throw error;
        console.error("Error fetching reviews", error);
    }

    // Check if reviews data is null and render error page
    if (!reviewsData) {
        return <p>Failed to load the Reviews.</p>;
    }

    const { reviews: reviewsList, averageRating, totalReviewCount } = reviewsData;

    const reviewsWithComments = reviewsList.filter((review) => review.comment?.trim());

    // With no written reviews left after filtering, the slider has nothing to show
    if (reviewsWithComments.length === 0) {
        return null;
    }

    const reviewSchema: WithContext<Testimonial>[] = reviewsWithComments.map((review) => ({
        "@context": "https://schema.org",
        "@type": "Review",
        author: {
            "@type": "Person",
            name: review.reviewer.displayName,
        },
        reviewRating: {
            "@type": "Rating",
            ratingValue: review.starRating === "ONE" ? 1 :
                review.starRating === "TWO" ? 2 :
                    review.starRating === "THREE" ? 3 :
                        review.starRating === "FOUR" ? 4 : 5,
            bestRating: 5,
        },
        reviewBody: review.comment || "", // Handle potentially null comment
        datePublished: review.createTime
    }));

    const jsonLd: WithContext<Organization> = {
        "@context": "https://schema.org",
        "@type": "Organization",
        name: "VeteranPCS",
        aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: averageRating,
            bestRating: 5,
            worstRating: 1,
            reviewCount: totalReviewCount
        },
        review: reviewSchema
    };

    return (
        <div>
            <Script id="json-ld-testimonials" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
            <ReviewTestimonial
                reviewsList={reviewsWithComments}
                averageRating={averageRating}
                totalReviewCount={totalReviewCount}
            />
        </div>
    )
} 
