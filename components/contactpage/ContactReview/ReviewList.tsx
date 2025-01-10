import ReviewTestimonial from "@/components/homepage/ReviewTestimonial/ReviewTestimonial";
import reviewService from "@/services/reviewService";
import { Review } from "@/components/homepage/ReviewTestimonial/ReviewTestimonial";
export default async function ReviewList() {
  let reviewsList = [];

  try {
    reviewsList = await reviewService.fetchReviews();
  } catch (error) {
    console.error('Failed to fetch Reviews:', error);
    return <p>Failed to load Reviews.</p>;
  }

  return (
    <ReviewTestimonial reviewsList={reviewsList as Review[]} />
  )
}