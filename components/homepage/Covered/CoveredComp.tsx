"use client";
import React, { useState, useEffect } from "react";
import ClassNames from "./CoveredComp.module.css";
import Image from "next/image";
import TrackedCtaLink from "@/components/common/TrackedCtaLink";

// Define the type for the 'card' prop
interface Card {
  img: string;
  imgred: string;
  title: string;
  subTitle: string;
  link: string;
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
    <TrackedCtaLink
      href={link}
      cta={{
        ctaId: 'homepage_covered_card',
        ctaIntent: 'content_navigation',
        ctaPosition: 'homepage_covered',
        ctaComponent: 'covered_card',
        ctaLabel: title,
        destination: link,
        pageType: 'homepage',
      }}
    >
      <div className={ClassNames.coveredwrappercontainer}>
        <div className="md:p-9 sm:p-2 p-4 cover-card mx-auto">
          <div className="text-center">
            <div className="md:block flex items-center md:justify-center justify-start">
              <div className="flex justify-center">
                <Image
                  width={80}
                  height={80}
                  className="coverd-link-img md:w-[80px] md:h-[80px] sm:w-[50px] sm:h-[50px] w-[60px] h-[60px] object-contain"
                  src={img}
                  alt=""
                />
                <Image
                  width={80}
                  height={80}
                  className="coverd-link-imgred md:w-[80px] md:h-[80px] sm:w-[50px] sm:h-[50px] w-[60px] h-[60px] object-contain"
                  src={imgred}
                  alt=""
                />
              </div>
              <div className="md:text-center text-left md:ml-0 ml-5">
                <div className="md:mt-5 mt-0">
                  <h4 className="text-[#292F6C] lg:text-[24px] md:text-[19px] sm:text-[16px] text-[18px] font-bold">
                    {title}
                  </h4>
                </div>
                <div className="md:mt-3 mt-0">
                  <span className="text-[#000000] lg:text-[18px] md:text-[19px] sm:text-[16px] text-[13px]">
                    {subTitle}
                  </span>
                </div>
                <div className="md:mt-3 sm:mt-0">
                  <span className="text-[#A81F23] text-[16px]">Learn more</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </TrackedCtaLink>
  );
};

export default Covered;
