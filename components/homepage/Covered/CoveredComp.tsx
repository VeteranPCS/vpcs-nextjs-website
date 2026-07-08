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
        <div className="p-3 md:p-6 cover-card mx-auto h-full">
          <div className="text-center">
            <div className="flex justify-center">
              <Image
                width={80}
                height={80}
                className="coverd-link-img w-8 h-8 md:w-12 md:h-12 object-contain"
                src={img}
                alt=""
              />
              <Image
                width={80}
                height={80}
                className="coverd-link-imgred w-8 h-8 md:w-12 md:h-12 object-contain"
                src={imgred}
                alt=""
              />
            </div>
            <h4 className="text-[#292F6C] text-base md:text-lg font-bold mt-2 md:mt-3">
              {title}
            </h4>
            <span className="text-[#000000] text-xs md:text-sm mt-1 block">
              {subTitle}
            </span>
            <span className="text-[#A81F23] text-xs md:text-base mt-0.5 md:mt-2 block">
              Learn more
            </span>
          </div>
        </div>
      </div>
    </TrackedCtaLink>
  );
};

export default Covered;
