"use client"
import { memo, useCallback, useEffect, useState } from "react"
import reviewService from "@/services/reviewService";
import ReviewTestimonial from "@/components/homepage/ReviewTestimonial/ReviewTestimonial";

const MemoizedReviewTestimonial = memo(ReviewTestimonial);

export default function ReviewsList() {
    const [reviewsList, SetReviewsList] = useState([]);

    const fetchReviews = useCallback(async () => {
        try {
            const response = await reviewService.fetchReviews()
            if (!response.ok) throw new Error('Failed to fetch posts')
            const data = await response.json()
            SetReviewsList(data)
        } catch (error) {
            console.error('Error fetching posts:', error)
        }
    }, []) 

    useEffect(() => {
        fetchReviews()
    }, [fetchReviews])

    return (
        <MemoizedReviewTestimonial reviewsList={reviewsList}/>
    )
} 
