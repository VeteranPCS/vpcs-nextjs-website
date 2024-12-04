"use client";
import React, { useState, useEffect } from "react";
// import Link from "next/link";
// import Head from "next/head";
import Button from "@/components/common/Button";
import "@/styles/globals.css";
import AOS from "aos";
import "aos/dist/aos.css";
import classes from "./HeroSection.module.css";

interface HeroSectionProps {
  title: string;
  subTitle: string;
  page: string;
}

const HeroSec = ({ title, subTitle, page }: HeroSectionProps) => {
  useEffect(() => {
    AOS.init({
      //   once: true,      // Make animation run once
    });
  }, []);
  return (
    <div>
      <div className={classes.herosectioncontainer}>
        <div className="container mx-auto">
          <div className="grid lg:grid-cols-2 md:grid-cols-1 sm:grid-cols-1 grid-cols-1 items-start justify-between gap-4">
            <div className="mx-auto lg:text-left md:text-left sm:text-center text-center w-full sm:order-2 order-2 lg:order-none md:order-none lg:mt-10">
              <h2 className="text-white font-bold lg:text-[59px] md:text-[29px] sm:text-[32px] text-[32px] leading-[1.3] tahoma">
                {title}
              </h2>
              <h1 className="lg:text-[18px] md:text-[18px] sm:text-[16px] text-[16px] font-normal text-white mb-10 mt-10 tahoma">
                {subTitle}
              </h1>
              {page == "home" && (
                <div className="flex justify-between xl:justify-start lg:justify-start md:justify-start sm:justify-between gap-4 mb-10 mt-10 mx-auto text-center ">
                  <div className="flex items-center gap-4">
                    <img
                      src="/icon/checkred.svg"
                      alt="check"
                      className="w-6 h-6"
                    />
                    <p className="text-white font-medium text-sm tahoma">
                      Free To Use
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <img
                      src="/icon/checkred.svg"
                      alt="check"
                      className="w-6 h-6"
                    />
                    <p className="text-white font-medium text-sm tahoma">
                      Free To Use
                    </p>
                  </div>
                </div>
              )}
              {page == "home" && (
                <div className="mt-28">
                  <Button buttonText="Find An Agent" />
                </div>
              )}
              {page == "spanish" && (
                <div className="lg:flex md:flex sm:hidden hidden justify-start items-center gap-4 flex-wrap ">
                  <Button buttonText="Browse our map" />
                  <p className="text-white font-normal xl:text-[30px] lg:text-[30px] md:text-[20px] sm:text-[20px] text-[20px] mx-10 xl:w-auto w-full">
                    OR
                  </p>
                  <Button buttonText="Find an agent for me" />
                </div>
              )}
            </div>
            <div className="mx-auto w-full mb-20 lg:mb-0 sm:order-1 order-1 lg:order-none md:order-none">
              <div className="flex justify-center">
                <div className="relative">
                  <img
                    src="/assets/house-hero-2024.png"
                    className="w-[873px] h-[482px] "
                    alt="Description of the image"
                    data-aos="fade-right"
                    data-aos-duration="1000"
                  />
                  <img
                    src="/assets/veteranPCS-slider-checks-03.png"
                    className="xl:w-[533px] xl:h-[533px] lg:w-[533px] lg:h-[533px] md:w-[450px] md:h-[450px] sm:w-full sm:h-[360px] w-full h-[360px] absolute top-[30%] left-[15%] -translate-x-2/4 -translate-y-2/4"
                    alt="Description of the image"
                    data-aos="fade-right"
                    data-aos-duration="1000"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="text-center pb-5 w-full relative  xl:top-[32%] lg:top-[32%] md:top-[23%] sm:top-[15%] top-[5%]">
          <h2 className="text-white text-center text-shadow-lg tahoma font-bold leading-10 lg:text-[59px] md:text-[29px] sm:text-[32px] text-[32px]">
            Buying or Selling?
          </h2>
          <p className="lg:text-[18px] md:text-[18px] sm:text-[16px] text-[16px] text-white text-center text-shadow-lg font-normal mb-10 mt-10 tahoma">
            Choose a state below to connect with our veteran and military spouse
            <br></br>
            agents and lenders
          </p>
        </div>
      </div>
    </div>
  );
};

export default HeroSec;
