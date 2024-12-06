"use client";
import React from "react"; // Keep this import
import "@/styles/globals.css";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import Slider from "react-slick";
import { Box } from "@mui/material";
import Image from "next/image";

// Define the type for each review item
interface Review {
  _id: string;
  name: string;
  designation: string;
  ratings: number;
  comment: string;
}

interface CarouselProps {
  reviews: Review[]; // Define the reviews prop as an array of Review items
}

const Carousel: React.FC<CarouselProps> = ({ reviews }) => {
  // Slider 1 settings (6 images visible at once)
  const settingsOne = {
    infinite: true,
    speed: 500,
    slidesToShow: 6, // Show 6 images
    slidesToScroll: 1,
    autoplay: false,
    autoplaySpeed: 3000,
    pauseOnHover: true,
    arrows: false,
    dots: true,
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

  // Slider 2 settings (1 image visible at once)
  const settingsTwo = {
    dots: false,
    infinite: true,
    speed: 500,
    autoplay: true,
    autoplaySpeed: 3000,
    pauseOnHover: true,
    slidesToShow: 1,
    slidesToScroll: 1,
    arrows: false,
    responsive: [
      {
        breakpoint: 1024,
        settings: {
          slidesToShow: 1, // Show 1 image on medium screens
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
      {/* Top Slider with 6 images shown */}
      <Box className="w-full">
        <Slider {...settingsOne} className="pt-10 reviw-topslider">
          {reviews.map((item, index) => (
            <div key={index} className="bg-white rounded-2xl p-2">
              <div className="flex items-center">
                <div className="bg-[#f2f2f2] w-[64px] h-[64px] rounded-full"></div>
                <div className="ml-3">
                  <h6 className="text-[#181818] text-[18px] font-normal tahoma">
                    {item.name}
                  </h6>
                  <p className="text-[#5A5A5A] text-[16px] font-normal tahoma">
                    {item.designation}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </Slider>
      </Box>

      {/* Second Slider with 1 image shown */}
      <Box className="w-full">
        <Slider {...settingsTwo} className="pt-10">
          {reviews.map((item) => (
            <div key={item._id} className="bg-white rounded-2xl p-10">
              <div className="flex items-center justify-center">
                <div className="text-center flex flex-col justify-center gap-10">
                  <div className="flex items-center justify-center">
                    {Array.from({ length: 5 }).map((_, index) =>
                      index < item.ratings ? (
                        <Image
                          width={24}
                          height={24}
                          key={index}
                          src="/icon/Star.svg" // Filled star
                          alt="star"
                          className="w-[24px] h-[24px] mr-2"
                        />
                      ) : (
                        ""
                      )
                    )}
                  </div>
                  <p className="text-[#181818] text-[18px] font-normal tahoma">
                    {item.comment}
                  </p>
                  <div className="flex justify-center">
                    <Image
                      width={100}
                      height={100}
                      src="/icon/Aven.svg"
                      alt="star"
                      className="w-[100px] h-[100px] mr-2"
                    />
                  </div>
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
