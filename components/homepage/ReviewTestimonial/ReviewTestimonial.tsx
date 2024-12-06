"use client";
import React from "react"; // No need for useState or useEffect
import "@/styles/globals.css";
import styled from "styled-components";
import Button from "@/components/common/Button";
import ReviewTestimonialSlider from "@/components/homepage/ReviewTestimonial/ReviewTestimonialSlider";
import classes from "./ReviewTestimonial.module.css";
import { useRouter } from 'next/navigation';

// Define the type for each review
interface Review {
  _id: string;  // Assuming each review has a unique id
  name: string;
  message: string;
  designation: string; // Add the missing field
  ratings: number;     // Add the missing field
  comment: string;     // Add the missing field
}

// Define the props for the component
interface ReviewTestimonialProps {
  reviewsList: Review[];
}

const ReviewTestimonial: React.FC<ReviewTestimonialProps> = ({ reviewsList }) => {
  const router = useRouter();

  return (
    <div className="w-full">
      <div className={classes.ReviewTestimonialContainer}>
        <div className="flex justify-center flex-col items-center xl:py-16 lg:py-16 px-5">
          <div className="">
            <h1 className="text-white tahoma text-center xl:text-[48px] lg:text-[48px] md:text-[38px] sm:text-[35px] text-[35px] font-bold leading-[30px] mt-5">
              We’ve helped hundreds
            </h1>
            <p className="text-center tahoma text-white  lg:text-[25px] md:text-[25px] sm:text-[17px] text-[17px] my-5">
              Of military, veterans, & their families
            </p>
          </div>
          <div>
            <ReviewTestimonialSlider reviews={reviewsList} />
          </div>
          <div>
            <Button buttonText="More success stories" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReviewTestimonial;
