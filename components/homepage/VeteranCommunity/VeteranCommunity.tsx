"use client";
import React from "react"; // No need for useState or useEffect
import "@/styles/globals.css";
import styled from "styled-components";
import Button from "@/components/common/Button";
import classes from "./VeteranCommunity.module.css";
import Image from "next/image";

const VeteranComunity = () => {
  return (
    <div className="w-full">
      <div className={classes.veterancommunitycontainer}>
        <div className="container mx-auto items-center grid lg:grid-cols-2 md:grid-cols-1 sm:grid-cols-1 grid-cols-1 justify-center xl:gap-10 lg:gap-10 md:gap-10 sm:gap-2 gap-2 xl:px-10 lg:px-10 md:px-10 sm:px-3 px-3">
          <div className="lg:text-left order-1 lg:order-none md:order-none">
            <div className="lg:block md:block sm:hidden hidden ">
              <Image
                width={100}
                height={100}
                src="/icon/userplus.svg"
                className="w-auto h-auto"
                alt="Description of the image"
              />
            </div>
            <div>
              <h1 className="text-white poppins lg:text-left md:text-left sm:text-center text-center text-3xl font-bold leading-[30px] mt-5">
                Support our veteran<br></br> community
              </h1>
              <p className="text-white text-xl lg:text-left md:text-left sm:text-center text-center italic font-mediumleading-[25px] mt-4 roboto">
                support mil spouse & veteran owned businesses
              </p>
            </div>
            <div className="mt-5">
              <div className="flex items-start gap-4 my-4">
                <Image
                  width={100}
                  height={100}
                  src="/icon/checkred.svg"
                  className="w-auto h-auto"
                  alt="Description of the image"
                />
                <h6 className="text-white roboto text-lg font-medium my-0">
                  Each closing gives 10% to military focused charities.
                </h6>
              </div>
              <div className="flex items-start gap-4 my-4">
                <Image
                  width={100}
                  height={100}
                  src="/icon/checkred.svg"
                  className="w-auto h-auto"
                  alt="Description of the image"
                />
                <h6 className="text-white roboto text-lg font-medium my-0">
                  <b className="italic">FREE</b> for agents to be listed.
                </h6>
              </div>
              <div className="flex items-start gap-4 my-4">
                <Image
                  width={100}
                  height={100}
                  src="/icon/checkred.svg"
                  className="w-auto h-auto"
                  alt="Description of the image"
                />
                <h6 className="text-white roboto text-lg font-medium my-0">
                  VeteranPCS is FREE to use. Part of your agents commission goes
                  back to you at closing.
                </h6>
              </div>
            </div>
            <div className="flex lg:justify-start md:justify-start sm:justify-center justify-center items-center">
              <Button buttonText="Our Impact" />
            </div>
          </div>
          <div>
            <Image
              width={552}
              height={552}
              src="/assets/soldiertraining.png"
              className="w-[552px] h-[552px]"
              alt="Description of the image"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default VeteranComunity;
