import React from "react";
import "@/app/globals.css";
import classes from "./MilitarySpouseHeroSection.module.css";
import Image from "next/image";

const HeroSec = () => {
  return (
    <div className="relative">
      <div className={classes.MilitrarySpouseContainer}>
        <div className="container mx-auto">
          <div className="grid lg:grid-cols-2 grid-cols-1 items-start justify-between gap-4">
            <div className="mx-auto text-left w-full order-2 md:order-none">
              <p className="text-white font-bold lg:text-[59px] md:text-[29px] text-[32px] poppins leading-[1.3] tahoma">
                MILITARY SPOUSE
              </p>
              <h1 className="md:text-[18px] text-[16px] font-normal text-white poppins mb-10 tahoma">
                The backbone of our armed forces. Thank you for supporting our
                service members. We’re here to support you.
              </h1>
              <div className="flex justify-between md:justify-start gap-4 mb-10 mt-10 mx-auto text-center">
                <div className="flex items-center gap-4">
                  <Image
                    width={100}
                    height={100}
                    src="/icon/checkred.svg"
                    alt="check"
                    className="w-6 h-6"
                    loading="eager"
                  />
                  <p className="text-white font-medium text-sm tahoma">
                    Free To Use
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <Image
                    width={100}
                    height={100}
                    src="/icon/checkred.svg"
                    alt="check"
                    className="w-6 h-6"
                    loading="eager"
                  />
                  <p className="text-white font-medium text-sm tahoma">
                    Free To Use
                  </p>
                </div>
              </div>
              <div className="absolute sm:bottom-[-15%] bottom-[-30%] xl:left-[41%] md:left-[35%] left-[27%]">
                <Image
                  width={1000}
                  height={1000}
                  src="/icon/VeteranPCS-logo_wht-outline.svg"
                  alt=""
                  className="sm:w-[250px] w-[200px] h-auto"
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

export default HeroSec;
