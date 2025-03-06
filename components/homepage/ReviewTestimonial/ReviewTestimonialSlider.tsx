"use client";
import React, { useState, useCallback } from "react";
import Slider from "react-slick";
import Image from "next/image";
import "./ReviewTestimonial.module.css";
import "@/app/globals.css";

interface Reviewer {
  profilePhotoUrl: string;
  displayName: string;
}

interface Review {
  comment: string;
  createTime: string;
  reviewId: string;
  reviewer: Reviewer;
  starRating: "ONE" | "TWO" | "THREE" | "FOUR" | "FIVE";
}

interface ReviewsSliderProps {
  reviews: Review[];
}

const StarRating: React.FC<{ rating: "ONE" | "TWO" | "THREE" | "FOUR" | "FIVE" }> = ({ rating }) => {
  const stars = {
    ONE: 1,
    TWO: 2,
    THREE: 3,
    FOUR: 4,
    FIVE: 5,
  }[rating] || 0;

  return (
    <div className="flex">
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className={i < stars ? "text-yellow-500" : "text-gray-300"}>
          ★
        </span>
      ))}
    </div>
  );
};

const ReviewCard: React.FC<{ review: Review }> = ({ review }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const formattedDate = new Date(review.createTime).toLocaleDateString();
  const shouldShowReadMore = review.comment.length > 250;

  return (
    <div className="bg-white rounded-lg p-6 shadow-lg mx-4 h-full">
      <div className="flex items-start gap-4 mb-4">
        {review.reviewer.profilePhotoUrl ? (
          <Image
            src={review.reviewer.profilePhotoUrl}
            alt={review.reviewer.displayName}
            width={48}
            height={48}
            className="rounded-full"
          />
        ) : (
          <div className="w-12 h-12 flex items-center justify-center bg-gray-200 rounded-full text-gray-700 font-bold text-lg">
            {review.reviewer.displayName.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="flex-1">
          <h3 className="font-bold text-gray-900 mb-1">{review.reviewer.displayName}</h3>
          <StarRating rating={review.starRating} />
        </div>
        <span className="text-sm text-gray-500">{formattedDate}</span>
      </div>

      <div className="relative">
        <p className={`text-gray-700 ${!isExpanded ? 'line-clamp-4' : ''}`}>
          {review.comment || "No review provided."}
        </p>

        {shouldShowReadMore && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-2 text-[#A81F23] hover:text-[#8a1a1d] font-medium focus:outline-none transition-colors duration-200"
          >
            {isExpanded ? 'Show less' : 'Read more'}
          </button>
        )}
      </div>
    </div>
  );
};

const ReviewsSlider: React.FC<ReviewsSliderProps> = ({ reviews }) => {
  const sliderSettings = {
    infinite: true,
    speed: 500,
    slidesToShow: 2,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 4000,
    arrows: true,
    responsive: [
      {
        breakpoint: 1024,
        settings: {
          slidesToShow: 2,
        },
      },
      {
        breakpoint: 768,
        settings: {
          slidesToShow: 1,
        },
      },
    ],
    nextArrow: <SampleNextArrow />,
    prevArrow: <SamplePrevArrow />
  };

  function SampleNextArrow(props: any) {
    const { onClick } = props;
    return (
      <button
        onClick={onClick}
        className="absolute -right-4 md:-right-8 lg:-right-10 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center bg-[#A81F23] hover:bg-opacity-90 rounded-full transition-all duration-200 focus:outline-none z-10 shadow-lg"
        aria-label="Next slide"
      >
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    );
  }

  function SamplePrevArrow(props: any) {
    const { onClick } = props;
    return (
      <button
        onClick={onClick}
        className="absolute -left-4 md:-left-8 lg:-left-10 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center bg-[#A81F23] hover:bg-opacity-90 rounded-full transition-all duration-200 focus:outline-none z-10 shadow-lg"
        aria-label="Previous slide"
      >
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
    );
  }

  return (
    <div className="relative">
      <style jsx global>{`
        .slick-track {
          display: flex !important;
          align-items: stretch;
        }
        .slick-slide {
          height: auto !important;
        }
        .slick-slide > div {
          height: 100%;
        }
        .slick-list {
          margin: 0 -12px;
        }
        .slick-slide > div {
          margin: 0 12px;
        }
      `}</style>
      <Slider {...sliderSettings}>
        {reviews.map((review) => (
          <div key={review.reviewId} className="h-full">
            <ReviewCard review={review} />
          </div>
        ))}
      </Slider>
    </div>
  );
};

export default ReviewsSlider;
