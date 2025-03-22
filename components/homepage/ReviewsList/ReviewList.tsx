import Script from "next/script";
import reviewService from "@/services/reviewService";
import ReviewTestimonial from "@/components/homepage/ReviewTestimonial/ReviewTestimonial";
import { Review } from "@/components/homepage/ReviewTestimonial/ReviewTestimonial";
import { WithContext, Review as Testimonial } from "schema-dts";
import { fetchGoogleReviews } from "@/utils/googleBusinessProfile";

export default async function ReviewsList() {
    let reviewsList = null;
    let aggregateRating = null;

    try {
        reviewsList = await fetchGoogleReviews();

        reviewsList = reviewsList.filter((review: Review) =>
            Boolean(review.comment?.trim())
        );

        aggregateRating = reviewsList.reduce((acc: number, review: Review) => {
            return acc + (review.starRating === "ONE" ? 1 :
                review.starRating === "TWO" ? 2 :
                    review.starRating === "THREE" ? 3 :
                        review.starRating === "FOUR" ? 4 : 5);
        }, 0);
        aggregateRating = aggregateRating / reviewsList.length;
    } catch (error) {
        console.error("Error fetching reviews", error);
    }

    // Check if blog is null and render error page
    if (!reviewsList) {
        return <p>Failed to load the Reviews.</p>;
    }
    const jsonLd: WithContext<Testimonial> = {
        "@context": "https://schema.org",
        "@type": "Review",
        aggregateRating: aggregateRating ? {
            "@type": "AggregateRating",
            ratingValue: aggregateRating,
            bestRating: 5,
            reviewCount: reviewsList.length
        } : undefined,
        review: reviewsList.map((review) => ({
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
                bestRating: 5
            },
            reviewBody: review.comment,
            datePublished: review.createTime,
            itemReviewed: {
                "@type": "Organization",
                "name": "VeteranPCS"
            }
        }))
    };

    return (
        <div>
            <Script id={`json-ld-testimonials`} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
            <ReviewTestimonial reviewsList={reviewsList} />
        </div>
    )
} 
