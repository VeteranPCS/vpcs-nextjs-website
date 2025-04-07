"use client";
import React, { useState, useEffect } from "react";
import "@/app/globals.css";
import Link from "next/link";
import Image from "next/image";

interface CardProps {
  img: string;
  imgHover?: string;
  title: string;
  description: string;
  link: string;
  learnMoreText?: string;
  containerClassName?: string;
  isVertical?: boolean;
}

const Card: React.FC<CardProps> = ({
  img,
  imgHover,
  title,
  description,
  link,
  learnMoreText = "Learn more",
  containerClassName = "",
  isVertical = true,
}) => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  return (
    <Link href={link}>
      <div className={`hover:shadow-lg transition-all duration-300 rounded-[16px] bg-white ${containerClassName}`}>
        <div className="xl:p-9 lg:p-9 md:p-9 sm:p-4 p-4 mx-auto">
          <div className="text-center">
            <div className={`${isVertical ? "xl:block lg:block md:block" : ""} sm:flex flex items-center lg:justify-center md:justify-center sm:justify-start justify-start`}>
              <div className="flex justify-center relative">
                <Image
                  width={80}
                  height={80}
                  className={`lg:w-[80px] lg:h-[80px] md:w-[80px] md:h-[80px] sm:w-[50px] sm:h-[50px] w-[60px] h-[60px] transition-opacity duration-300 ${imgHover ? "group-hover:opacity-0" : ""}`}
                  src={img}
                  alt={title}
                />
                {imgHover && (
                  <Image
                    width={80}
                    height={80}
                    className="absolute top-0 left-0 right-0 mx-auto lg:w-[80px] lg:h-[80px] md:w-[80px] md:h-[80px] sm:w-[50px] sm:h-[50px] w-[60px] h-[60px] opacity-0 hover:opacity-100 transition-opacity duration-300"
                    src={imgHover}
                    alt={title}
                  />
                )}
              </div>
              <div className={`${isVertical ? "xl:text-center lg:text-center md:text-center" : ""} sm:text-left text-left xl:ml-0 lg:ml-0 md:ml-0 sm:ml-5 ml-5`}>
                <div className="xl:mt-5 lg:mt-5 md:mt-5 sm:mt-0 mt-0">
                  <h4 className="text-[#292F6C] lg:text-[24px] md:text-[19px] sm:text-[16px] text-[18px] font-bold tahoma">
                    {title}
                  </h4>
                </div>
                <div className="xl:mt-3 lg:mt-3 md:mt-3 sm:mt-0 mt-0">
                  <span className="text-[#000000] lg:text-[18px] md:text-[19px] sm:text-[16px] text-[13px]">
                    {description}
                  </span>
                </div>
                <div className="xl:mt-3 lg:mt-3 md:mt-3 sm:mt-0">
                  <span className="text-[#A81F23] text-[16px]">{learnMoreText}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default Card;