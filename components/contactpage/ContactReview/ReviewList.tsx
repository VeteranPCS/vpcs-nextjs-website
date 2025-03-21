import ReviewTestimonial from "@/components/homepage/ReviewTestimonial/ReviewTestimonial";
import { Review } from "@/components/homepage/ReviewTestimonial/ReviewTestimonial";
import { fetchGoogleReviews } from "@/utils/googleBusinessProfile";
export default async function ReviewList() {
  let reviewsList = [];

  try {
    reviewsList = await fetchGoogleReviews();
  } catch (error) {
    console.error('Failed to fetch Reviews:', error);
    return <p>Failed to load Reviews.</p>;
  }

  return (
    <ReviewTestimonial reviewsList={reviewsList as Review[]} />
  )
}