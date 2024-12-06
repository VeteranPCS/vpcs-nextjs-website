"use client";
import React, { useState, useEffect } from "react";
import "@/styles/globals.css";
import Button from "@/components/common/Button";
import classes from "./AboutHeroSection.module.css";
import Image from "next/image";

const AboutHeroSection = () => {
  return (
    <div className="relative">
      <div className={classes.AboutHeroSectionContainer}>
        <div className="container mx-auto">
          <div className="grid lg:grid-cols-2 md:grid-cols-1 sm:grid-cols-1 grid-cols-1 items-start justify-between gap-6 mb-6">
            <div className="mx-auto lg:text-left md:text-left sm:text-center text-center w-full sm:order-2 order-2 lg:order-none md:order-none">
              <h1 className="text-white font-bold lg:text-[59px] md:text-[29px] sm:text-[32px] text-[32px] poppins leading-[1.3] tahoma">
                Community Impact
              </h1>
              <p className="lg:text-[18px] md:text-[18px] sm:text-[16px] text-[16px] font-normal text-white poppins mb-10 mt-4 tahoma">
                VeteranPCS was designed to make a difference in the lives of
                military families. Connecting you with fellow veterans and
                military spouses you can trust to help make a new place
                Home.This is military families, helping military families move.
              </p>
              <div>
                <Button buttonText="Selling or Moving?" />
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutHeroSection;
