import React from "react";
import "@/app/globals.css";
import classes from "./MilitarySpouseHeroSection.module.css";
import Image from "next/image";

const HeroSec = () => {
  return (
    <div className="relative">
      <div className={classes.MilitrarySpouseContainer}>
        <div className="container mx-auto">
          <div className="grid lg:grid-cols-2 md:grid-cols-1 sm:grid-cols-1 grid-cols-1 items-start justify-between gap-4">
            <div className="mx-auto text-left w-full sm:order-2 order-2 lg:order-none md:order-none">
              <p className="text-white font-bold lg:text-[59px] md:text-[29px] sm:text-[32px] text-[32px] poppins leading-[1.3] tahoma">
                MILITARY SPOUSE
              </p>
              <h1 className="lg:text-[18px] md:text-[18px] sm:text-[16px] text-[16px] font-normal text-white poppins mb-10 tahoma">
                The backbone of our armed forces. Thank you for supporting our
                service members. We’re here to support you.
              </h1>
              <div className="flex justify-between xl:justify-start lg:justify-start md:justify-start sm:justify-between gap-4 mb-10 mt-10 mx-auto text-center">
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
              <div className="absolute sm:bottom-[-15%] bottom-[-30%] xl:left-[41%] lg:left-[35%] md:left-[35%] sm:left-[27%] left-[27%] translate-[-45%] ">
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

export default HeroSec;
