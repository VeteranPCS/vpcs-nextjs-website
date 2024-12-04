"use client";
import React, { useState, useEffect } from "react";
import "@/styles/globals.css";
import classes from "./YourImpact.module.css";

const HeroSec = () => {
  return (
    <div>
      <div className={classes.yourimpactsectioncontainer}>
        <div className="container mx-auto">
          <div className="text-center">
            <p className="text-white font-bold lg:text-[48px] md:text-[29px] sm:text-[32px] text-[32px] poppins leading-[1.3] tahoma">
              Your Impact
            </p>
            <h1 className="lg:text-[18px] md:text-[18px] sm:text-[16px] text-[16px] font-normal text-white poppins mb-10 mt-3 tahoma">
              With your support we have been able to aid the military community
              in amazing ways
            </h1>
          </div>
          <div className="grid lg:grid-cols-3 md:grid-cols-2 sm:grid-cols-1 grid-cols-1 items-start justify-between gap-10 mt-20">
            <div className="text-center lg:mt-3 md:mt-3 sm:mt-3 mt-3">
              <div className="flex justify-center mx-auto w-[70px] h-[70px]">
                <img
                  src="/icon/yourimpacthendwhhite.svg"
                  alt="impact_wearblue"
                  className="w-full h-full"
                />
              </div>
              <div>
                <h2 className="text-white font-bold text-[42px] tahoma mt-5 mb-2">
                  $235,500+
                </h2>
                <p className="text-white font-normal text-[23px] tahoma">
                  Hero savings given back
                </p>
              </div>
            </div>
            <div className="text-center lg:mt-3 md:mt-3 sm:mt-3 mt-3">
              <div className="flex justify-center mx-auto w-[70px] h-[70px]">
                <img
                  src="/icon/yourhome.svg"
                  alt="impact_wearblue"
                  className="w-full h-full"
                />
              </div>
              <div>
                <h2 className="text-white font-bold text-[42px] tahoma mt-5 mb-2">
                  2 Million
                </h2>
                <p className="text-white font-normal text-[23px] tahoma">
                  Hero savings given back
                </p>
              </div>
            </div>
            <div className="text-center lg:mt-3 md:mt-3 sm:mt-3 mt-3">
              <div className="flex justify-center mx-auto w-[70px] h-[70px]">
                <img
                  src="/icon/yourSymbol.svg"
                  alt="impact_wearblue"
                  className="w-full h-full"
                />
              </div>
              <div>
                <h2 className="text-white font-bold text-[42px] tahoma mt-5 mb-2">
                  $235,500+
                </h2>
                <p className="text-white font-normal text-[23px] tahoma">
                  Hero savings given back
                </p>
              </div>
            </div>
            <div className="text-center lg:mt-3 md:mt-3 sm:mt-3 mt-3">
              <div className="flex justify-center mx-auto w-[70px] h-[70px]">
                <img
                  src="/icon/yourSymbolcontact.svg"
                  alt="impact_wearblue"
                  className="w-full h-full"
                />
              </div>
              <div>
                <h2 className="text-white font-bold text-[42px] tahoma mt-5 mb-2">
                  $235,500+
                </h2>
                <p className="text-white font-normal text-[23px] tahoma">
                  Hero savings given back
                </p>
              </div>
            </div>
            <div className="text-center lg:mt-3 md:mt-3 sm:mt-3 mt-3">
              <div className="flex justify-center mx-auto w-[70px] h-[70px]">
                <img
                  src="/icon/yoursymbousers.svg"
                  alt="impact_wearblue"
                  className="w-full h-full"
                />
              </div>
              <div>
                <h2 className="text-white font-bold text-[42px] tahoma mt-5 mb-2">
                  2 Million
                </h2>
                <p className="text-white font-normal text-[23px] tahoma">
                  Hero savings given back
                </p>
              </div>
            </div>
            <div className="text-center lg:mt-3 md:mt-3 sm:mt-3 mt-3">
              <div className="flex justify-center mx-auto w-[70px] h-[70px]">
                <img
                  src="/icon/yoursymbolmeet.svg"
                  alt="impact_wearblue"
                  className="w-full h-full"
                />
              </div>
              <div>
                <h2 className="text-white font-bold text-[42px] tahoma mt-5 mb-2">
                  $235,500+
                </h2>
                <p className="text-white font-normal text-[23px] tahoma">
                  Hero savings given back
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroSec;
