"use client";
import "@/app/globals.css";
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
    slidesToShow: 4,
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
    <section
      id="features-partners"
      aria-labelledby="features-partners-title"
      className="container mx-auto comlogoslider scroll-mt-24 px-4"
    >
      <h3 id="features-partners-title" className="pt-6 text-center text-2xl font-bold text-primary sm:pt-10 sm:text-4xl">
        Features & Partners
      </h3>
      <Box className="w-full">
        <Slider {...settings} className="py-5 md:py-10">
          {logoList.map((item: any, index: number) => (
            <a
              key={"logo-slider" + (item._id || index)}
              className="mx-auto flex h-16 w-full max-w-[220px] items-center justify-center px-3 sm:h-20 sm:max-w-[260px] md:h-28 md:max-w-[340px] md:px-4 xl:h-32 xl:max-w-[420px]"
              href={item.url}
            >
              <Image
                height={1000}
                width={1000}
                src={item?.mainImage?.asset?.image_url || item.imageUrl}
                alt={item?.mainImage?.alt || item.title}
                className="h-full w-full object-contain opacity-80 transition-opacity duration-200 ease-in-out hover:opacity-100"
              />
            </a>
          ))}
        </Slider>
      </Box>
    </section>
  );
};

export default Carousel;
