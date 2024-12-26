import React from "react";
import "@/styles/globals.css";
import classes from "./ThankYouHeroSection.module.css";
import Image from "next/image";
import Button from "@/components/common/Button";
import Link from "next/link";

const ThankYouHeroSection = () => {
  return (
    <div className="relative">
      <div className={classes.thankyouherosectioncontainer}>
        <div className="container mx-auto px-5">
          <div className="grid lg:grid-cols-2 md:grid-cols-1 sm:grid-cols-1 grid-cols-1 items-start justify-between gap-4">
            <div className="mx-auto lg:text-left md:text-left sm:text-leeft text-leeft w-full sm:order-2 order-2 lg:order-none md:order-none">
              <h1 className="text-white font-bold lg:text-[59px] md:text-[29px] sm:text-[32px] text-[32px] poppins mb-5 tahoma leading-[1.3]">
                Thanks for connecting, you’re in good hands!
              </h1>
              <p className="lg:text-[18px] md:text-[18px] sm:text-[16px] text-[16px] font-normal text-white poppins mb-10 tahoma">
                Check your email for contact information
              </p>
              <Link href="/contact">
                <Button buttonText="Contact us" />
              </Link>
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

export default ThankYouHeroSection;
