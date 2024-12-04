"use client";
import React, { useState, useEffect } from "react";
import "@/styles/globals.css";

const HeroSec = () => {
  return (
    <div className="relative">
      <div>
        <div className="container mx-auto pt-20 pb-10">
          <div className="mx-auto text-center w-full sm:order-2 order-2 lg:order-none md:order-none">
            <p className="text-[#292F6C] font-bold lg:text-[59px] md:text-[29px] sm:text-[32px] text-[32px] poppins leading-[1.3] tahoma">
              Check out our success stories
            </p>
            <h1 className="lg:text-[18px] md:text-[18px] sm:text-[16px] text-[16px] font-normal text-[#7E1618] poppins mb-10 tahoma">
              Military community helping military community move.
            </h1>
          </div>
          <div className="mt-32">
            <div className="grid lg:grid-cols-2 md:grid-cols-1 sm:grid-cols-1 grid-cols-1 items-start justify-between gap-4 mb-5">
              <div>
                <img
                  src="/assets/succsesStories.png"
                  alt="Tyler Success Story"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="lg:ml-10 md:ml-10 sm:ml-0 ml-0">
                <h1 className="text-[#003486] poppins lg:text-[41px] md:text-[41px] sm:text-[35px] text-[35px] font-bold lg:leading-[45px] md:leading-[45px] sm:leading-[40px] leading-[40px]">
                  Tyler & Ana Success Story
                </h1>
                <div className="mt-8">
                  <h6 className="text-[#000000] text-[18px] font-medium m-0 p-0">
                    Active duty military family
                  </h6>
                  <h6 className="text-[#000000] text-[18px] font-medium m-0 p-0">
                    Struggling with using other sites during their PCS
                  </h6>
                  <h6 className="text-[#000000] text-[18px] font-medium m-0 p-0">
                    Recieved $1,200 Move-In-Bonus
                  </h6>
                </div>
              </div>
            </div>
            <div className="bg-[#EDEDED] grid lg:grid-cols-2 md:grid-cols-1 sm:grid-cols-1 grid-cols-1 items-start justify-between gap-4 mb-5 p-5">
              <div className="lg:ml-10 md:ml-10 sm:ml-0 ml-0">
                <h1 className="text-[#003486] poppins lg:text-[41px] md:text-[41px] sm:text-[35px] text-[35px] font-bold lg:leading-[45px] md:leading-[45px] sm:leading-[40px] leading-[40px]">
                  Micah & Natalia Success<br></br>
                  Story
                </h1>
                <div className="mt-8">
                  <h6 className="text-[#000000] text-[18px] font-medium m-0 p-0">
                    Active duty military family
                  </h6>
                  <h6 className="text-[#000000] text-[18px] font-medium m-0 p-0">
                    Struggling with using other sites during their PCS
                  </h6>
                  <h6 className="text-[#000000] text-[18px] font-medium m-0 p-0">
                    Recieved $1,200 Move-In-Bonus
                  </h6>
                </div>
              </div>
              <div>
                <img
                  src="/assets/succsesStories.png"
                  alt="Tyler Success Story"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            <div className="grid lg:grid-cols-2 md:grid-cols-1 sm:grid-cols-1 grid-cols-1 items-start justify-between gap-4 mb-5">
              <div>
                <img
                  src="/assets/succsesStories.png"
                  alt="Tyler Success Story"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="lg:ml-10 md:ml-10 sm:ml-0 ml-0">
                <h1 className="text-[#003486] poppins lg:text-[41px] md:text-[41px] sm:text-[35px] text-[35px] font-bold lg:leading-[45px] md:leading-[45px] sm:leading-[40px] leading-[40px] mb-4">
                  Did you know civilians can<br></br>
                  use VeteranPCS to buy or<br></br>
                  sell a home?
                </h1>
                <div className="mt-8">
                  <h6 className="text-[#000000] text-[18px] font-medium m-0 p-0">
                    You get to choose a military charity to donate your bonus
                    check too
                  </h6>
                  <h6 className="text-[#000000] text-[18px] font-medium m-0 p-0">
                    Mt. Carmel received $400.00 thanks to Ken and Jen
                  </h6>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroSec;
