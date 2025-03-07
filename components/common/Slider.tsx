"use client";
import "@/styles/globals.css";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import Slider from "react-slick";
import { Box } from "@mui/material";
import Image from "next/image";

const Carousel = ({ logoList }: { logoList: any }) => {
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
        breakpoint: 1290,
        settings: {
          slidesToShow: 3,
        },
      },
      {
        breakpoint: 1024,
        settings: {
          slidesToShow: 3,
        },
      },
      {
        breakpoint: 768,
        settings: {
          slidesToShow: 2,
        },
      },
    ],
  };

  return (
    <div className="container mx-auto comlogoslider">
      <h3 className="text-center text-2xl sm:text-4xl font-bold text-[#292F6C] pt-6 sm:pt-10">
        Features & Partners
      </h3>
      <Box className="w-full">
        <Slider {...settings} className="md:py-8 py-3">
          {logoList.map((item: any, index: number) => (
            <a
              key={"logo-slider" + (item._id || index)}
              className="w-[230px] px-9"
              href={item.url}
            >
              <Image
                height={1000}
                width={1000}
                src={item?.mainImage?.asset?.image_url || item.imageUrl}
                alt={item?.mainImage?.alt || item.title}
                className="w-full h-full opacity-40 hover:opacity-100 transition-all duration-300 ease-in-out object-contain"
              />
            </a>
          ))}
        </Slider>
      </Box>
    </div>
  );
};

export default Carousel;
