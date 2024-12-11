import { useState, useEffect } from "react";
import ReviewTestimonial from "@/components/homepage/ReviewTestimonial/ReviewTestimonial";
import reviewService from "@/services/reviewService";

export default function ReviewList() {
    const [reviewsList, SetReviewsList] = useState([]);

    useEffect(() => {
        fetchReviews();
    }, []);

    const fetchReviews = async () => {
        try {
          const response = await reviewService.fetchReviews();
          if (!response.ok) throw new Error("Failed to fetch posts");
          const data = await response.json();
          SetReviewsList(data);
        } catch (error) {
          console.error("Error fetching posts:", error);
        }
      };

      return (
        <ReviewTestimonial reviewsList={reviewsList} />
      )
}