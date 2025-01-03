import React from "react";
import "@/styles/globals.css";
import Button from "@/components/common/Button";
import ReviewTestimonialSlider from "@/components/homepage/ReviewTestimonial/ReviewTestimonialSlider";
import classes from "./ReviewTestimonial.module.css";
import Link from "next/link";

export interface Review {
  _id: string; // Assuming each review has a unique id
  name: string;
  message: string;
  designation: string; // Add the missing field
  ratings: number; // Add the missing field
  comment: string; // Add the missing field
}

interface ReviewTestimonialProps {
  reviewsList: Review[];
}

const ReviewTestimonial: React.FC<ReviewTestimonialProps> = ({
  reviewsList,
}) => {
  return (
    <div className="w-full">
      <div className={classes.ReviewTestimonialContainer}>
        <div className="xl:py-16 lg:py-16 px-5 mx-auto">
          <div className="">
            <h1 className="text-white tahoma text-center xl:text-[48px] lg:text-[48px] md:text-[38px] sm:text-[35px] text-[35px] font-bold leading-[50px] mt-5">
              We’ve helped hundreds
            </h1>
            <p className="text-center tahoma text-white  lg:text-[25px] md:text-[25px] sm:text-[17px] text-[17px] my-5">
              Of military, veterans, & their families
            </p>
          </div>
          <div>
            <ReviewTestimonialSlider reviews={reviewsList} />
          </div>
        </div>
        <div className="flex justify-center mt-10">
          <Link href="/stories">
            <Button buttonText="More success stories" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ReviewTestimonial;
