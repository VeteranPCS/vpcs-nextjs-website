"use client"
import "@/styles/globals.css";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import Slider from "react-slick";
import { Box } from "@mui/material";
import Image from "next/image"; // Ensure you use the Next.js Image component

const Carousel = ({ agentList }: { agentList: any }) => {
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
        <Slider {...settings} className="md:py-20 py-3">
          {agentList.map((item: any, index: number) => (
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
