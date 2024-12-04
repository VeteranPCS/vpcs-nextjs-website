"use client";
import React, { useState, useEffect } from "react";
import "@/styles/globals.css";
import styled from "styled-components";
import Link from "next/link";
import ClassNames from "./CoverdComp.module.css";

const Covered = ({ card }) => {
  const { img, imgred, title, subTitle, link } = card;

  // State to check if the component has mounted (to avoid SSR issues)
  const [isMounted, setIsMounted] = useState(false);

  // Set the state after component mounts
  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null; // Return nothing before mount to avoid hydration issues
  }

  return (
    <div className={ClassNames.coveredwrappercontainer}>
      <div className="xl:p-9 lg:p-9 md:p-9 sm:p-2 p-4 cover-card  mx-auto">
        <div className="text-center">
          <div className="xl:block lg:block md:block sm:flex flex items-center justify-center">
            <div className="flex justify-center">
              <img className="coverd-link-img" src={img} alt="" />
              <img className="coverd-link-imgred" src={imgred} alt="" />
            </div>
            <div className="xl:text-center lg:text-center md:text-center sm:text-left text-left xl:ml-0 lg:ml-0 md:ml-0 sm:ml-5 ml-5">
              <div className="xl:mt-10 lg:mt-10 md:mt-10 sm:mt-0 mt-0">
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
                    href="#"
                    className="text-[#A81F23] mt-10 lg:text-[20px] md:text-[19px] sm:text-[16px] text-[16px] poppins"
                  >
                    {link}
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
