"use client";
import React, { useEffect } from "react";
import "@/app/globals.css";
import Card from "./Card";
import AOS from "aos";
import "aos/dist/aos.css";

interface CardData {
  img: string;
  imgHover?: string;
  title: string;
  description: string;
  link: string;
  learnMoreText?: string;
}

interface CardGridProps {
  cards: CardData[];
  title?: string;
  subtitle?: string;
  gridClassName?: string;
  cardClassName?: string;
  isVertical?: boolean;
  learnMoreText?: string;
  enableAnimation?: boolean;
}

const CardGrid: React.FC<CardGridProps> = ({
  cards,
  title,
  subtitle,
  gridClassName = "grid xl:grid-cols-3 lg:grid-cols-2 md:grid-cols-2 sm:grid-cols-1 grid-cols-1 lg:mt-20 md:mt-10 sm:mt-10 mt-5 justify-center xl:gap-10 lg:gap-10 md:gap-10 sm:gap-2 gap-2 xl:px-10 lg:px-10 md:px-10 sm:px-3 px-3",
  cardClassName = "",
  isVertical = true,
  learnMoreText = "Learn more",
  enableAnimation = true
}) => {
  useEffect(() => {
    if (enableAnimation) {
      AOS.init({
        once: true,
      });
    }
  }, [enableAnimation]);

  return (
    <div className="container mx-auto w-full lg:py-16 md:py-16 sm:py-16 py-0 md:pt-32 sm:pb-5 pb-5">
      {(title || subtitle) && (
        <div
          className="px-4 bg-[#ffffff] mx-auto text-center"
          data-aos={enableAnimation ? "fade-right" : ""}
          data-aos-duration="1000"
        >
          <div className="md:block sm:hidden hidden">
            {title && (
              <h2 className="text-[#292F6C] font-bold lg:text-[48px] md:text-[29px] sm:text-[25px] text-[20px] tahoma md:block">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="normal text-[#7E1618] lg:text-[18px] md:text-[19px] sm:text-[16px] text-[16px] leading-[32px] font-medium md:block tahoma">
                {subtitle}
              </p>
            )}
          </div>
        </div>
      )}
      
      <div
        className={gridClassName}
        data-aos={enableAnimation ? "fade-left" : ""}
        data-aos-duration="1000"
      >
        {cards.map((card, index) => (
          <Card
            key={index}
            img={card.img}
            imgHover={card.imgHover}
            title={card.title}
            description={card.description}
            link={card.link}
            learnMoreText={card.learnMoreText || learnMoreText}
            containerClassName={cardClassName}
            isVertical={isVertical}
          />
        ))}
      </div>
    </div>
  );
};

export default CardGrid;