import React from "react";
import "@/styles/globals.css";
import classes from "./HowItWorkHeroSection.module.css";
import Image from "next/image";
import howItWorksService from "@/services/howItWorksService";
import { HowItWorksContentProps } from '@/services/howItWorksService';

async function HowItWorkHeroSection() {
  let overviewSection: HowItWorksContentProps | null = null;

  try {
    overviewSection = await howItWorksService.fetchOverviewSection("how-veteranpcs-works");
  } catch (error) {
    console.error("Error fetching blogs", error);
  }

  if (!overviewSection) {
    return <p>Failed to load the How It Works Overview Section.</p>;
  }

  return (
    <div className="relative">
      <div className={classes.HowitworkHeroSectionContainer}>
        <div className="container mx-auto">
          <div className="grid lg:grid-cols-2 md:grid-cols-1 sm:grid-cols-1 grid-cols-1 items-start justify-between gap-4">
            <div className="mx-auto text-left w-full sm:order-2 order-2 lg:order-none md:order-none">
              <h1 className="text-white lg:text-[52px] md:text-[52px] sm:text-[32px] text-[32px] poppins leading-[1.3] tahoma">
                {overviewSection.component_header[0].children.map((child) =>
                  child.marks.includes("strong") ? (
                    <span key={child._key} className="font-bold">
                      {child.text}
                    </span>
                  ) : (
                    child.text
                  )
                )}
              </h1>
              <div className=" mb-10 mt-10">
                {overviewSection.description.map((item, index) => (
                  <div key={index} className="flex items-start gap-4 my-4">
                    <Image
                      width={100}
                      height={100}
                      src="/icon/checkred.svg"
                      alt="check"
                      className="w-7 h-7 mt-2"
                      loading="eager"
                    />
                    <p className="text-white poppins lg:text-[24px] md:text-[20px] sm:text-[16px] text-[16px] font-medium text-sm tahoma lg:w-[450px] md:w-[450px] sm:w-full w-full leading-8">
                      {item.children.map((child) => child.text).join(" ")}
                    </p>
                  </div>
                ))}
              </div>
              <div className="absolute bottom-[-15%] lg:left-[45%] md:left-[45%] sm:left-[27%] left-[27%] translate-[-45%] ">
                <Image
                  width={1000}
                  height={1000}
                  src="/icon/VeteranPCS-logo_wht-outline.svg"
                  alt="Description of the image"
                  className="lg:w-[250px] lg:h-[250px] md:w-[250px] md:h-[250px] sm:w-[250px] sm:h-[250px] w-[200px] h-[200px]"
                  loading="eager"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HowItWorkHeroSection;
