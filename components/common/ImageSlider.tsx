"use client";
import React from "react"; // Keep this import
import "@/app/globals.css";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import Slider from "react-slick";
import { Box } from "@mui/material";
import Image from "next/image";

export interface UserImage {
  _id: string;
  userImage: {
    asset: {
      image_url: string;
      _ref: string;
    };
    alt: string;
  };
}

interface CarouselProps {
  userImageList: UserImage[];
}

const Carousel: React.FC<CarouselProps> = ({ userImageList }) => {
  const fallbackData = [
    {
      title: "Item 1",
      description: "Description for item 1",
      imageUrl: "/assets/imageslider.webp",
    },
    {
      title: "Item 2",
      description: "Description for item 2",
      imageUrl: "/assets/imageslider1.webp",
    },
    {
      title: "Item 3",
      description: "Description for item 3",
      imageUrl: "/assets/imageslider2.webp",
    },
    {
      title: "Item 4",
      description: "Description for item 4",
      imageUrl: "/assets/imageslider3.webp",
    },
    {
      title: "Item 5",
      description: "Description for item 5",
      imageUrl: "/assets/imageslider4.webp",
    },
    {
      title: "Item 6",
      description: "Description for item 6",
      imageUrl: "/assets/imageslider5.webp",
    },
    {
      title: "Item 7",
      description: "Description for item 7",
      imageUrl: "/assets/imageslider6.webp",
    },
  ];
  const settings = {
    dots: false,
    infinite: true,
    speed: 500,
    slidesToShow: 5,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 3000,
    pauseOnHover: true,
    arrows: false,
    responsive: [
      {
        breakpoint: 1024,
        settings: {
          slidesToShow: 3,
        },
      },
      {
        breakpoint: 500,
        settings: {
          slidesToShow: 1,
        },
      },
    ],
  };

  return (
    <div className="mx-auto comlogoslider bg-[#ffffff]">
      <Box className="w-full">
        <Slider {...settings} className="py-3">
          {userImageList.map((item) => (
            <div
              key={"settings" + item._id}
              className="xl:w-[230px] lg:w-[300px] md:w-[300px] sm:w-full w-full px-2"
            >
              <Image
                width={1000}
                height={1000}
                src={
                  item?.userImage?.asset?.image_url || "/placeholder.jpg" // Fallback in case neither exists
                }
                alt={item?.userImage?.alt}
                className="w-full h-full object-contain"
              />
            </div>
          ))}
          {userImageList.length == 0 &&
            fallbackData.map((item, index) => (
              <div
                key={index}
                className="xl:w-[230px] lg:w-[300px] md:w-[300px] sm:w-full w-full px-2"
              >
                <Image
                  width={1000}
                  height={1000}
                  src={item.imageUrl}
                  alt={item.title}
                  className="w-full h-full object-contain"
                />
              </div>
            ))}
        </Slider>
      </Box>
    </div>
  );
};

export default Carousel;
