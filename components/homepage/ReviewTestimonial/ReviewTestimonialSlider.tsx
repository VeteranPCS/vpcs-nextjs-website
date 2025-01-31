"use client";
import React from "react";
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
  const formattedDate = new Date(review.createTime).toLocaleDateString();

  return (
    <div className="bg-white shadow-lg rounded-lg p-4 flex flex-col w-full">
      {/* Header (Profile & Name) */}
      <div className="flex items-center gap-3">
        {review.reviewer.profilePhotoUrl ? (
          <Image
            src={review.reviewer.profilePhotoUrl}
            alt={review.reviewer.displayName}
            width={40}
            height={40}
            className="rounded-full"
          />
        ) : (
          <div className="w-10 h-10 flex items-center justify-center bg-gray-200 rounded-full text-gray-700 font-bold">
            {review.reviewer.displayName.charAt(0).toUpperCase()}
          </div>
        )}
        <div>
          <p className="font-semibold">{review.reviewer.displayName}</p>
          <StarRating rating={review.starRating} />
        </div>
      </div>

      {/* Review Text */}
      <p className="mt-3 text-gray-700">{review.comment || "No review provided."}</p>

      {/* Date */}
      <p className="mt-3 text-sm text-gray-500">{formattedDate}</p>
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
    arrows: false,
    dots: true,
    appendDots: (dots: React.ReactNode) => (
      <div className="flex justify-center">
        <ul className="flex space-x-2">{dots}</ul>
      </div>
    ),
    customPaging: () => (
      <button className="slick-dot"
        style={{
          width: "15px",
          height: "15px",
          borderRadius: "50%",
          backgroundColor: "#9599b3",
          cursor: "pointer",
        }}
      />),
    responsive: [
      {
        breakpoint: 1024, // Tablets
        settings: {
          slidesToShow: 2,
        },
      },
      {
        breakpoint: 768, // Mobile
        settings: {
          slidesToShow: 1,
        },
      },
    ],
  };

  return (
    <div className="w-full max-w-5xl mx-auto mt-20">
      <Slider {...sliderSettings}>
        {reviews.map((review) => (
          <div key={review.reviewId} className="px-2">
            <ReviewCard review={review} />
          </div>
        ))}
      </Slider>
    </div>
  );
};

export default ReviewsSlider;
