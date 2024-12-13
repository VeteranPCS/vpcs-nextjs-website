import React from "react";
import "@/styles/globals.css";
import classes from "./HowItWorkHeroSection.module.css";
import Image from "next/image";

function HowItWorkHeroSection() {
  return (
    <div className="relative">
      <div className={classes.HowitworkHeroSectionContainer}>
        <div className="container mx-auto">
          <div className="grid lg:grid-cols-2 md:grid-cols-1 sm:grid-cols-1 grid-cols-1 items-start justify-between gap-4">
            <div className="mx-auto text-left w-full sm:order-2 order-2 lg:order-none md:order-none">
              <h1 className="text-white font-bold lg:text-[52px] md:text-[52px] sm:text-[32px] text-[32px] poppins leading-[1.3] tahoma">
                How <span className="font-normal">Veteran</span>PCS works
              </h1>
              <div className=" mb-10 mt-10">
                <div className="flex items-start gap-4 my-4">
                  <Image
                    width={100}
                    height={100}
                    src="/icon/checkred.svg"
                    alt="check"
                    className="w-7 h-7 mt-2"
                  />
                  <p className="text-white poppins lg:text-[24px] md:text-[20px] sm:text-[16px] text-[16px] font-medium text-sm tahoma lg:w-[450px] md:w-[450px] sm:w-full w-full leading-8">
                    Use the map on our homepage to find a real estate agent or
                    lender
                  </p>
                </div>
                <div className="flex items-start gap-4 my-4">
                  <Image
                    width={100}
                    height={100}
                    src="/icon/checkred.svg"
                    alt="check"
                    className="w-7 h-7 mt-2"
                  />
                  <p className="text-white poppins lg:text-[24px] md:text-[20px] sm:text-[16px] text-[16px] font-medium text-sm tahoma lg:w-[450px] md:w-[450px] sm:w-full w-full leading-8">
                    Connect with an agent or lender that is the best fit for you
                  </p>
                </div>
                <div className="flex items-start gap-4 my-4">
                  <Image
                    width={100}
                    height={100}
                    src="/icon/checkred.svg"
                    alt="check"
                    className="w-7 h-7 mt-2"
                  />
                  <p className="text-white poppins lg:text-[24px] md:text-[20px] sm:text-[16px] text-[16px] font-medium text-sm tahoma lg:w-[450px] md:w-[450px] sm:w-full w-full leading-8">
                    We follow up with you to ensure you’re having a good
                    experience
                  </p>
                </div>
                <div className="flex items-start gap-4 my-4">
                  <Image
                    width={100}
                    height={100}
                    src="/icon/checkred.svg"
                    alt="check"
                    className="w-7 h-7 mt-2"
                  />
                  <p className="text-white poppins lg:text-[24px] md:text-[20px] sm:text-[16px] text-[16px] font-medium text-sm tahoma lg:w-[450px] md:w-[450px] sm:w-full w-full leading-8">
                    After closing, we send you a bonus of $200-$4000 and donate
                    an additional 10% to a military-focused charity
                  </p>
                </div>
              </div>
              <div className="absolute bottom-[-15%] lg:left-[45%] md:left-[45%] sm:left-[27%] left-[27%] translate-[-45%] ">
                <Image
                  width={1000}
                  height={1000}
                  src="/icon/VeteranPCS-logo_wht-outline.svg"
                  alt="Description of the image"
                  className="lg:w-[250px] lg:h-[250px] md:w-[250px] md:h-[250px] sm:w-[250px] sm:h-[250px] w-[200px] h-[200px]"
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
