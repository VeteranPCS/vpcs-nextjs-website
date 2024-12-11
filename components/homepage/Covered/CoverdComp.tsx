"use client";
import React, { useState, useEffect } from "react";
import "@/styles/globals.css";
import Link from "next/link";
import ClassNames from "./CoverdComp.module.css";
import Image from "next/image";

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
    <div className={ClassNames.coveredwrappercontainer}>
      <div className="xl:p-9 lg:p-9 md:p-9 sm:p-2 p-4 cover-card mx-auto">
        <div className="text-center">
          <div className="xl:block lg:block md:block sm:flex flex items-center lg:justify-center md:justify-center sm:justify-start justify-start">
            <div className="flex justify-center">
              <Image
                width={80}
                height={80}
                className="coverd-link-img lg:w-[80px] lg:h-[80px] md:w-[80px] md:h-[80px] sm:w-[50px] sm:h-[50px] w-[60px] h-[60px]"
                src={img}
                alt=""
              />
              <Image
                width={80}
                height={80}
                className="coverd-link-imgred lg:w-[80px] lg:h-[80px] md:w-[80px] md:h-[80px] sm:w-[50px] sm:h-[50px] w-[60px] h-[60px]"
                src={imgred}
                alt=""
              />
            </div>
            <div className="xl:text-center lg:text-center md:text-center sm:text-left text-left xl:ml-0 lg:ml-0 md:ml-0 sm:ml-5 ml-5">
              <div className="xl:mt-5 lg:mt-5 md:mt-5 sm:mt-0 mt-0">
                <h4 className="text-[#292F6C] lg:text-[24px] md:text-[19px] sm:text-[16px] text-[18px] font-bold tahoma">
                  {title}
                </h4>
              </div>
              <div className="xl:mt-3 lg:mt-3 md:mt-3 sm:mt-0 mt-0">
                <span className="text-[#000000] lg:text-[18px] md:text-[19px] sm:text-[16px] text-[13px]">
                  {subTitle}
                </span>
              </div>
              <div className="xl:mt-3 lg:mt-3 md:mt-3 sm:mt-0">
                <strong>
                  <Link
                    href={link}
                    className="text-[#A81F23] mt-10 lg:text-[20px] md:text-[19px] sm:text-[16px] text-[16px] poppins"
                  >
                    Learn more
                  </Link>
                </strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Covered;
