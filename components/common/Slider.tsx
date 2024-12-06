import React, { useState, useEffect } from "react";
import "@/styles/globals.css";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import Slider from "react-slick";
import { Box } from "@mui/material";
import Image from "next/image"; // Ensure you use the Next.js Image component

const defaultCarouselData = [
  {
    title: "Item 1",
    description: "Description for item 1",
    imageUrl: "/assets/comlogo1.png",
  },
  {
    title: "Item 2",
    description: "Description for item 2",
    imageUrl: "/assets/comlogo2.png",
  },
  {
    title: "Item 3",
    description: "Description for item 3",
    imageUrl: "/assets/comlogo3.png",
  },
  {
    title: "Item 4",
    description: "Description for item 4",
    imageUrl: "/assets/comlogo4.png",
  },
  {
    title: "Item 5",
    description: "Description for item 5",
    imageUrl: "/assets/comlogo5.png",
  },
  {
    title: "Item 6",
    description: "Description for item 6",
    imageUrl: "/assets/comlogo6.png",
  },
  {
    title: "Item 7",
    description: "Description for item 7",
    imageUrl: "/assets/comlogo7.png",
  },
  {
    title: "Item 8",
    description: "Description for item 8",
    imageUrl: "/assets/comlogo8.png",
  },
  {
    title: "Item 9",
    description: "Description for item 9",
    imageUrl: "/assets/comlogo9.png",
  },
  {
    title: "Item 10",
    description: "Description for item 10",
    imageUrl: "/assets/comlogo10.png",
  },
  {
    title: "Item 11",
    description: "Description for item 11",
    imageUrl: "/assets/comlogo11.png",
  },
];

const Carousel = ({ agentList }: { agentList: any }) => {
  const [carouselItems, setCarouselItems] = useState<any[]>([]);

  useEffect(() => {
    setCarouselItems(agentList?.length > 0 ? agentList : defaultCarouselData);
  }, [agentList]);

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
        breakpoint: 768,
        settings: {
          slidesToShow: 1,
        },
      },
    ],
  };

  return (
    <div className="container mx-auto comlogoslider">
      <Box className="w-full">
        <Slider {...settings} className="py-20">
          {carouselItems.map((item: any, index: number) => (
            <a key={item._id || index} className="w-[230px] px-9" href={item.url}>
              <Image
                height={100}
                width={100}
                src={item?.mainImage?.asset?.image_url || item.imageUrl}
                alt={item?.mainImage?.alt || item.title}
                className="w-full h-full"
              />
            </a>
          ))}
        </Slider>
      </Box>
    </div>
  );
};

export default Carousel;
