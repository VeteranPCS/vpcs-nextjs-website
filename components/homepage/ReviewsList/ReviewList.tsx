import { memo } from "react"
import Script from "next/script";
import reviewService from "@/services/reviewService";
import ReviewTestimonial from "@/components/homepage/ReviewTestimonial/ReviewTestimonial";
import { Review } from "@/components/homepage/ReviewTestimonial/ReviewTestimonial";
import { WithContext, Review as Testimonial } from "schema-dts";

const MemoizedReviewTestimonial = memo(ReviewTestimonial);

export default async function ReviewsList() {
    let reviewsList = null;

    try {
        reviewsList = await reviewService.fetchReviews();

        reviewsList = reviewsList.filter((review: Review) =>
            Boolean(review.comment?.trim())
        );
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
            <MemoizedReviewTestimonial reviewsList={reviewsList} />
        </div>
    )
} 
