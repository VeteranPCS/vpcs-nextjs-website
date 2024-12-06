"use client";
import React from "react"; // No need for useState or useEffect
import "@/styles/globals.css";
import "@/styles/globals.css";
import Button from "@/components/common/Button";
import classes from "./FamilySupport.module.css";
import Image from "next/image";

const FamilySupport = () => {
  return (
    <div className="container mx-auto w-full py-16">
      <div className={classes.familysupportcontainer}>
        <div
          className="items-center grid lg:grid-cols-2 md:grid-cols-1 sm:grid-cols-1
         grid-cols-1 justify-center xl:gap-10 lg:gap-10 md:gap-10 sm:gap-2 gap-2 xl:px-10 lg:px-10 md:px-10 sm:px-3 px-3 lg:py-12"
        >
          <div className="flex justify-center">
            <Image
              src="/assets/meetdaugether.png"
              width={530}
              height={530}
              alt="Description of the image"
              className="lg:w-[530px] lg:h-[530px] md:w-[530px] md:h-[530px] sm:w-[326px] sm:h-[326px] w-[326px] h-[326px]"
            />
          </div>
          <div className="text-left">
            <div className="lg:block md:block sm:hidden hidden ">
              <Image
                width={100}
                height={100}
                className=" w-auto h-auto"
                src="/icon/userplus.svg"
                alt="Description of the image"
              />
            </div>
            <div>
              <h1 className="text-white poppins lg:text-[31px] md:text-[31px] sm:text-[31px] text-[31px] font-bold mt-5 lg:text-left md:text-left sm:text-center text-center">
                Support veterans & their <br></br> families
              </h1>
              <p className="text-white roboto lg:text-[18px] md:text-[19px] sm:text-[16px] text-[16px] italic font-medium leading-[25px] mt-4 lg:text-left md:text-left sm:text-center text-center">
                Every Agent and VA Loan expert is a veteran or military<br></br>{" "}
                spouse that understands the stresses of moving in the<br></br>{" "}
                <i>military or after the military.</i>
              </p>
            </div>
            <div className="mt-5">
              <div className="flex items-start gap-4">
                <Image
                  width={100}
                  height={100}
                  className=" w-auto h-auto mt-2"
                  src="/icon/checkred.svg"
                  alt="Description of the image"
                />
                <h6 className="text-white roboto lg:text-[18px] md:text-[19px] sm:text-[16px] text-[16px] font-medium leading-[41px]">
                  <b className="italic">Support</b> military, veterans and
                  families
                </h6>
              </div>
              <div className="flex items-start gap-4">
                <Image
                  width={100}
                  height={100}
                  className=" w-auto h-auto mt-2"
                  src="/icon/checkred.svg"
                  alt="Description of the image"
                />
                <h6 className="text-white roboto lg:text-[18px] md:text-[19px] sm:text-[16px] text-[16px] font-medium leading-[41px]">
                  <b className="italic">Support</b> veteran and military spouse
                  employment
                </h6>
              </div>
              <div className="flex items-start gap-4">
                <Image
                  width={100}
                  height={100}
                  className=" w-auto h-auto mt-2"
                  src="/icon/checkred.svg"
                  alt="Description of the image"
                />
                <h6 className="text-white roboto lg:text-[18px] md:text-[19px] sm:text-[16px] text-[16px] font-medium leading-[41px]">
                  <b className="italic">Support</b> military-focused charity
                </h6>
              </div>
            </div>
            <div className="flex lg:justify-start md:justify-start sm:justify-center justify-center items-center">
              <Button buttonText="How it Works" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FamilySupport;
