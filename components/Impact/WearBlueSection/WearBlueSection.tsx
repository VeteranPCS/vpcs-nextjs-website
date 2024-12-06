"use client";
import React, { useState, useEffect } from "react";
// import Link from "next/link";
// import Head from "next/head";
import Button from "@/components/common/Button";
import "@/styles/globals.css";
import "aos/dist/aos.css";
import Image from "next/image";

const MilitaryHomePage = () => {
  return (
    <div className="bg-[#F4F4F4]">
      <div className="container mx-auto px-8">
        <div className="flex flex-col md:flex-row items-center justify-center py-10 md:py-20">
          <div className="w-full md:w-1/2  flex justify-center">
            <Image
              width={400}
              height={400}
              src="/assets/wereblueleft.png"
              // src="./assets/wereblueleft.png"
              alt="Military Family"
              className="w-[400px] h-[400px]"
            />
          </div>
          <div className="w-full md:w-1/2 mt-10 md:mt-0">
            <div>
              <Image
                width={273}
                height={63}
                src="/assets/wearblue.png"
                alt="wearblue"
                className="w-[273px] h-[63px]"
              />
            </div>
            <h6 className="lg:text-left md:text-left sm:text-center text-center lg:text-[25px] font-bold text-[#292F6C] mt-5 tahoma uppercase">
              WEAR BLUE RUN TO REMEMBER
            </h6>
            <p className="text-black font-roboto text-base font-medium ">
              Wear blue’s mission is to honor the service and sacrifice of the
              American military through active remembrance.
            </p>
            <div className="flex lg:justify-start md:justify-start sm:justify-center justify-center">
              <Button buttonText="Read More" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MilitaryHomePage;
