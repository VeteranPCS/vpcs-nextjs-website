"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import ClassNames from "./StatePageWhyChooseVetpcs.module.css";
import Image from "next/image";

// Define the type for the 'card' prop
interface Card {
  img: string;
  imgred?: string;
  title: string;
  subTitle: string;
  link?: string;
}

interface CoveredProps {
  card: Card;
}

const Covered: React.FC<CoveredProps> = ({ card }) => {
  const { img, imgred, title, subTitle, link } = card;

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  return (
    <div className={ClassNames.statepahewhychoosedwrappercontainer}>
      <div className="md:p-9 sm:p-2 p-4 cover-card mx-auto">
        <div className="text-center my-5">
          <div className="md:block flex items-center justify-center flex-wrap">
            <div className="flex justify-center">
              <Image
                width={70}
                height={70}
                className="md:w-[70px] md:h-[70px] sm:w-[50px] sm:h-[50px] w-[60px] h-[60px]"
                src={img}
                alt=""
              />
            </div>
            <div className="text-center md:ml-0 sm:ml-5 ml-0 mt-4">
              <div className="md:mt-5 mt-0">
                <h4 className="text-[#FFFFFF] lg:text-[24px] md:text-[19px] sm:text-[16px] text-[18px] font-bold tahoma">
                  {title}
                </h4>
              </div>
              <div className="md:mt-3 mt-0 px-10">
                <span className="text-[#FFFFFF] lg:text-[18px] md:text-[19px] sm:text-[16px] text-[13px] ">
                  {subTitle}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Covered;
