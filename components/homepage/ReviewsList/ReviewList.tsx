import { memo } from "react"
import reviewService from "@/services/reviewService";
import ReviewTestimonial from "@/components/homepage/ReviewTestimonial/ReviewTestimonial";

const MemoizedReviewTestimonial = memo(ReviewTestimonial);

export default async function ReviewsList() {
    let reviewsList = null;

    try {
        reviewsList = await reviewService.fetchReviews();        
    } catch (error) {
        console.error("Error fetching reviews", error);
    }

    // Check if blog is null and render error page
    if (!reviewsList) {
        return <p>Failed to load the Reviews.</p>;
    }

    return (
        <MemoizedReviewTestimonial reviewsList={reviewsList}/>
    )
} 
