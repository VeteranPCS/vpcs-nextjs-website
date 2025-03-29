import ReviewTestimonial from "@/components/homepage/ReviewTestimonial/ReviewTestimonial";
import { Review } from "@/components/homepage/ReviewTestimonial/ReviewTestimonial";
import { fetchGoogleReviews } from "@/utils/googleBusinessProfile";

interface ReviewsData {
  reviews: Review[];
  averageRating: number;
  totalReviewCount: number;
}

export default async function ReviewList() {
  let reviewsData: ReviewsData | null = null;

  try {
    reviewsData = await fetchGoogleReviews();
  } catch (error) {
    console.error('Failed to fetch Reviews:', error);
    return <p>Failed to load Reviews.</p>;
  }

  if (!reviewsData) {
    return <p>Failed to load Reviews.</p>;
  }

  const { reviews: reviewsList, averageRating, totalReviewCount } = reviewsData;

  return (
    <ReviewTestimonial
      reviewsList={reviewsList}
      averageRating={averageRating}
      totalReviewCount={totalReviewCount}
    />
  )
}