"use client";
import React from "react";
import "@/styles/globals.css";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import Slider from "react-slick";
import { Box } from "@mui/material";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";

// Define the type for each review item
interface Reviewer {
  profilePhotoUrl: string;
  displayName: string;
}

interface Review {
  comment: string;
  createTime: string;
  name: string;
  reviewId: string;
  reviewer: Reviewer;
  starRating: 'ONE' | 'TWO' | 'THREE' | 'FOUR' | 'FIVE';
  updateTime: string;
}

interface CarouselProps {
  reviews: Review[];
}

const NameIcon: React.FC<{ name: string }> = ({ name }) => {
  const initial = name.charAt(0).toUpperCase();
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#f2f2f2",
        color: "#181818",
        width: 60,
        height: 60,
        borderRadius: "50%",
        fontSize: 100 / 2.5,
        fontWeight: "bold",
        textTransform: "uppercase",
      }}
    >
      {initial}
    </div>
  );
};

const Carousel: React.FC<CarouselProps> = ({ reviews }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [reviewDetails, setReviewDetails] = useState<Review>(reviews[0]);
  const [slidesToShow, setSlidesToShow] = useState(6);
  const sliderRef = useRef<Slider>(null); // Reference to the Slider

  const updateSlidesToShow = () => {
    const screenWidth = window.innerWidth;
    if (screenWidth < 768) {
      setSlidesToShow(1);
    } else if (screenWidth < 1024) {
      setSlidesToShow(3);
    } else {
      setSlidesToShow(6);
    }
  };

  useEffect(() => {
    updateSlidesToShow();
    window.addEventListener("resize", updateSlidesToShow);
    return () => {
      window.removeEventListener("resize", updateSlidesToShow);
    };
  }, []);

  useEffect(() => {
    if (reviews.length > 0) {
      sliderRef.current?.slickGoTo(0);
      const currentIndex = Math.floor(slidesToShow / 2);
      setActiveIndex(currentIndex);
    }
  }, [reviews, slidesToShow])

  useEffect(() => {
    setSelectedReview(reviews[activeIndex]);
  }, [activeIndex, reviews])

  function setSelectedReview(review: Review) {
    setReviewDetails(review);
  }

  const settingsOne = {
    infinite: true,
    speed: 500,
    slidesToShow: 6, // Show 6 images
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 3000,
    pauseOnHover: true,
    arrows: false,
    dots: false,
    afterChange: () => {
      const nextIndex = activeIndex === reviews.length - 1 ? 0 : activeIndex + 1;

      setActiveIndex(nextIndex);
      setSelectedReview(reviews[activeIndex]);
    },
    responsive: [
      {
        breakpoint: 1024,
        settings: {
          slidesToShow: 3, // Show 3 images on medium screens
        },
      },
      {
        breakpoint: 768,
        settings: {
          slidesToShow: 1, // Show 1 image on small screens
        },
      },
    ],
  };

  return (
    <div className="container mx-auto comlogoslider">
      <Box className="w-full">
        <Slider {...settingsOne} ref={sliderRef} className="pt-10 reviw-topslider">
          {reviews.map((item, index) => {
            // Check if the current slide is the middle slide
            const isMiddle = index === activeIndex;

            return (
              <div
                key={"settingsOne" + index}
                className="bg-white rounded-2xl p-2 slider-box"
              >
                {isMiddle ? (
                  <div className="flex items-center">
                    <div className="bg-[#f2f2f2] w-[60px] h-[60px] rounded-full">
                      {item?.reviewer?.profilePhotoUrl ? (
                        <Image
                          src={item?.reviewer?.profilePhotoUrl}
                          alt="User logo"
                          width={60}
                          height={60}
                          className="w-[60px] h-[60px] rounded-full"
                        />
                      ) : (
                        <NameIcon name={item?.reviewer?.displayName} />
                      )}
                    </div>
                    <div className="ml-3">
                      <h6 className="text-[#181818] text-[18px] font-normal tahoma text-nowrap">
                        {item?.reviewer?.displayName}
                      </h6>
                    </div>
                  </div>
                ) : (
                  // Simplified version for other reviews
                  <div className="bg-[#f2f2f2] w-[60px] h-[60px] rounded-full">
                  </div>
                )}
              </div>
            );
          })}
        </Slider>
      </Box>

      <Box className="w-full mt-10">
        <div
          // key={"settingsTwo" + item._id}
          className="bg-white rounded-2xl p-10"
        >
          <div className="text-center flex flex-col justify-center gap-10 tw-overflow-y-scroll">
            <div className="flex mx-auto">
              {Array.from({ length: 5 }).map((_, index) => {
                const ratingMap = {
                  'ONE': 1,
                  'TWO': 2,
                  'THREE': 3,
                  'FOUR': 4,
                  'FIVE': 5
                };
                const numericRating = reviewDetails?.starRating ? ratingMap[reviewDetails.starRating] : 0;

                return index < numericRating ? (
                  <Image
                    width={24}
                    height={24}
                    key={index}
                    src="/icon/Star.svg"
                    alt="star"
                    className="w-[24px] h-[24px] mr-2"
                  />
                ) : (
                  <Image
                    width={24}
                    height={24}
                    key={index}
                    src="/icon/EmptyStar.svg" // Add an empty star image
                    alt="empty star"
                    className="w-[24px] h-[24px] mr-2"
                  />
                );
              })}
            </div>
            <p className="text-[#181818] text-[18px] font-normal tahoma">
              {reviewDetails?.comment || "No comment"}
            </p>
            <div className="flex justify-center">
              {reviewDetails?.reviewer?.profilePhotoUrl ? (
                <Image
                  src={reviewDetails?.reviewer?.profilePhotoUrl}
                  alt="User logo"
                  width={100}
                  height={100}
                  className="w-[100px] h-[100px] rounded-full"
                />
              ) : (
                <NameIcon name={reviewDetails?.reviewer?.displayName} />
              )}
            </div>
          </div>
        </div>
      </Box>
    </div>
  );
};

export default Carousel;