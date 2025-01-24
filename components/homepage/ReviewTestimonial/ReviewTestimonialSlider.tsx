"use client";
import React from "react";
import "@/styles/globals.css";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import Slider from "react-slick";
import { Box } from "@mui/material";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";

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
  starRating: "ONE" | "TWO" | "THREE" | "FOUR" | "FIVE";
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
  const [slidesToShow, setSlidesToShow] = useState(6);
  const topSliderRef = useRef<Slider>(null);
  const bottomSliderRef = useRef<Slider>(null);

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
      const currentIndex = Math.floor(slidesToShow / 2);
      setActiveIndex(currentIndex);
    }
  }, [reviews, slidesToShow]);

  const settingsOne = {
    infinite: true,
    speed: 500,
    slidesToShow: 6,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 3000,
    pauseOnHover: true,
    arrows: false,
    dots: true,
    centerMode: true,
    centerPadding: "0px",
    swipe: false,
    touchMove: false,
    beforeChange: (current: number, next: number) => {
      setActiveIndex(next);
      bottomSliderRef.current?.slickGoTo(next);
    },
    responsive: [
      {
        breakpoint: 1024,
        settings: {
          slidesToShow: 3,
        },
      },
      {
        breakpoint: 768,
        settings: {
          slidesToShow: 1,
        },
      },
    ],
    appendDots: (dots: React.ReactNode) => (
      <CustomDots
        currentSlide={activeIndex}
        slideCount={reviews.length}
        goTo={(index) => {
          topSliderRef.current?.slickGoTo(index);
          bottomSliderRef.current?.slickGoTo(index);
        }}
      />
    ),
  };

  const settingsTwo = {
    ...settingsOne,
    slidesToShow: 1,
    fade: false,
    cssEase: "linear",
    autoplay: false,
    dots: false,
  };

  const CustomDots: React.FC<{
    currentSlide: number;
    slideCount: number;
    goTo: (index: number) => void;
  }> = ({ currentSlide, slideCount, goTo }) => {
    const maxDots = 6;
    const totalDots = Math.min(slideCount, maxDots);

    return (
      <div className="slick-dots-container">
        {Array.from({ length: totalDots }).map((_, index) => (
          <button
            key={index}
            className={`slick-dot ${currentSlide === index ? "active" : ""}`}
            onClick={() => goTo(index)}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="container mx-auto comlogoslider relative">
      <Box className="w-full custom-slider">
        <Slider
          {...settingsOne}
          ref={topSliderRef}
          className="pt-10 reviw-topslider"
        >
          {reviews.map((item, index) => {
            const isMiddle = index === activeIndex;
            return (
              <div key={item.reviewId}>
                {isMiddle ? (
                  <div className="bg-white rounded-2xl p-2 slider-box activesliderbox">
                    <div className="flex items-center w-full">
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
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl p-2 slider-box withoutdatasliderbox">
                    <div className="bg-[#f2f2f2] w-[60px] h-[60px] rounded-full"></div>
                  </div>
                )}
              </div>
            );
          })}
        </Slider>
      </Box>

      <Box className="w-full mt-10">
        <Slider {...settingsTwo} ref={bottomSliderRef}>
          {reviews.map((review) => (
            <div key={review.reviewId}>
              <div className="bg-white rounded-2xl p-10 h-[450px] overflow-hidden relative">
                <div className="text-center flex flex-col justify-center gap-10 w-full">
                  <div className="flex mx-auto">
                    {Array.from({ length: 5 }).map((_, index) => {
                      const ratingMap = {
                        ONE: 1,
                        TWO: 2,
                        THREE: 3,
                        FOUR: 4,
                        FIVE: 5,
                      };
                      const numericRating = review?.starRating
                        ? ratingMap[review.starRating]
                        : 0;

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
                          src="/icon/EmptyStar.svg"
                          alt="empty star"
                          className="w-[24px] h-[24px] mr-2"
                        />
                      );
                    })}
                  </div>
                  <p className="text-[#181818] text-[18px] font-normal tahoma min-h-[250px]">
                    {review?.comment || "No comment"}
                  </p>
                  <div className="flex justify-center absolute left-0 right-0 bottom-10">
                    {review?.reviewer?.profilePhotoUrl ? (
                      <Image
                        src={review?.reviewer?.profilePhotoUrl}
                        alt="User logo"
                        width={100}
                        height={100}
                        className="w-[100px] h-[100px] rounded-full"
                      />
                    ) : (
                      <NameIcon name={review?.reviewer?.displayName} />
                    )}
                  </div>
                </div>
                <div>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="16"
                    viewBox="0 0 18 16"
                    fill="none"
                  >
                    <path
                      d="M8.0301 14.9705C8.415 15.6371 9.37725 15.6371 9.76215 14.9705L16.9708 2.48476C17.3557 1.8181 16.8745 0.984763 16.1047 0.984763H1.6875C0.917702 0.984763 0.436578 1.8181 0.821478 2.48476L8.0301 14.9705Z"
                      fill="white"
                    />
                  </svg>
                </div>
              </div>
            </div>
          ))}
        </Slider>
      </Box>
    </div>
  );
};

export default Carousel;
