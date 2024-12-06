"use client";
import React, { useState, useEffect } from "react";
import "@/styles/globals.css";
import classes from "./ImpactHeroSection.module.css";
import Image from "next/image";

const HeroSec = () => {
  return (
    <div className="relative">
      <div className={classes.impactherosectioncontainer}>
        <div className="container mx-auto">
          <div className="grid lg:grid-cols-2 md:grid-cols-1 sm:grid-cols-1 grid-cols-1 items-start justify-between gap-4">
            <div className="mx-auto lg:text-left md:text-left sm:text-center text-center w-full sm:order-2 order-2 lg:order-none md:order-none">
              <h1 className="text-white font-bold lg:text-[59px] md:text-[29px] sm:text-[32px] text-[32px] poppins mb-5 tahoma leading-[1.3]">
                Community <br></br>
                Impact
              </h1>
              <p className="lg:text-[18px] md:text-[18px] sm:text-[16px] text-[16px] font-normal text-white poppins mb-10 tahoma">
                By supporting VeteranPCS you are supporting veteran communities
              </p>
              <div className="flex justify-between xl:justify-start lg:justify-start md:justify-start sm:justify-between gap-4 mb-10 mt-10 mx-auto text-center">
                <div className="flex items-center gap-4">
                  <Image
                    width={100}
                    height={100}
                    src="/icon/checkred.svg"
                    alt="check"
                    className="w-6 h-6"
                  />
                  <p className="text-white font-medium text-sm tahoma">
                    Free To Use
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <Image
                    width={100}
                    height={100}
                    src="/icon/checkred.svg"
                    alt="check"
                    className="w-6 h-6"
                  />
                  <p className="text-white font-medium text-sm tahoma">
                    Free To Use
                  </p>
                </div>
              </div>
              <div className="absolute bottom-[-15%] left-[45%] translate-[-45%] lg:block md:block sm:hidden hidden">
                <Image
                  width={250}
                  height={250}
                  src="/icon/VeteranPCS-logo_wht-outline.svg"
                  alt="Description of the image"
                  className="w-[250px] h-[250px]"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Image
                width={583}
                height={444}
                src="/assets/impact_wearblue.png"
                alt="impact_wearblue"
                className="w-[583px] h-[444px]"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroSec;
