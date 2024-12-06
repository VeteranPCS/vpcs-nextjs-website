"use client";
import React from "react"; // No need for useState or useEffect
import "@/styles/globals.css";
import "@/styles/globals.css";
import Button from "@/components/common/Button";
import classes from "./AboutOurStory.module.css";
import Image from "next/image";

const FamilySupport = () => {
  return (
    <div className="container mx-auto w-full py-16">
      <div className={classes.aboutourstorycontainer}>
        <div className="grid lg:grid-cols-2 md:grid-cols-1 sm:grid-cols-1 grid-cols-1 justify-center xl:gap-10 lg:gap-10 md:gap-10 sm:gap-2 gap-2 xl:px-10 lg:px-10 md:px-10 sm:px-3 px-3 lg:py-12 items-center">
          <div className="flex justify-center">
            <Image
              width={426}
              height={500}
              src="/assets/CEO-founder-Jason-Anderson.png"
              alt="Description of the image"
              className="lg:w-[426px] lg:h-[500px] md:w-[426px] md:h-[500px] sm:w-[326px] sm:h-[326px] w-[326px] h-[326px]"
            />
          </div>
          <div>
            <div>
              <h1 className="text-white poppins lg:text-[35px] md:text-[35px] sm:text-[31px] text-[31px] font-bold mt-5 lg:text-left md:text-left sm:text-center text-center">
                Learn more about our Story
              </h1>
              <p className="text-white roboto lg:text-[16px] md:text-[16px] sm:text-[16px] text-[16px] font-medium mt-4 lg:w-[500px] md:w-[500px] sm:w-full w-full">
                VeteranPCS was designed to make a difference in the lives of
                military families. Connecting you with fellow veterans and
                military spouses you can trust to help make a new place Home.
              </p>
              <p className="text-white roboto lg:text-[16px] md:text-[16px] sm:text-[16px] text-[16px] font-bold mt-4">
                We are military families, helping military families move.
              </p>
            </div>
            <div>
              <Button buttonText="OUR STORY" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FamilySupport;
