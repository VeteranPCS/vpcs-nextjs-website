"use client";
import React from "react"; // No need for useState or useEffect
import "@/styles/globals.css";
import "@/styles/globals.css";
import classes from "./Mission.module.css";
import Button from "@/components/common/Button";

const Mission = () => {
  return (
    <div className="container mx-auto w-full py-16">
      <div className={classes.missioncontainer}>
        <div
          className="items-center grid lg:grid-cols-2 md:grid-cols-1 sm:grid-cols-1
         grid-cols-1 justify-center xl:gap-10 lg:gap-10 md:gap-10 sm:gap-2 gap-2 xl:px-10 lg:px-10 md:px-10 sm:px-3 px-3 lg:py-12"
        >
          <div className="flex justify-end">
            <img
              src="/assets/Mission.png"
              className="lg:w-[552px] lg:h-[552px] md:w-[552px] md:h-[552px] sm:w-[326px] sm:h-[326px] w-[326px] h-[326px]"
              alt="Description of the image"
            />
          </div>
          <div className="text-left">
            <div>
              <h1 className="text-white poppins lg:text-[31px] md:text-[31px] sm:text-[31px] text-[31px] font-bold mt-5 lg:text-left md:text-left sm:text-center text-center">
                Move with a mission
              </h1>
              <p className="text-white lg:text-[20px] md:text-[19px] sm:text-[16px] text-[16px] font-normal leading-[30px] mt-4 lg:text-left md:text-left sm:text-center text-center tahoma">
                With VeteranPCS, not only do you get great service and a Move In
                Bonus up to $4,000, but you also get to support veteran and
                military spouse businesses by working with a veteran or military
                spouse real estate agent and VA loan expert. On top of that,
                part of the proceeds of every closing get donated to a
                veteran-focused charity.This is military families helping
                military families move.
              </p>
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

export default Mission;
