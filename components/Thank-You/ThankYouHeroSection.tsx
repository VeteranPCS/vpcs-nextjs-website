import React from "react";
import classes from "./ThankYouHeroSection.module.css";
import Image from "next/image";
import Button from "@/components/common/Button";
import Link from "next/link";

const ThankYouHeroSection = () => {
  return (
    <div className="relative">
      <div className={classes.thankyouherosectioncontainer}>
        <div className="container mx-auto px-5">
          <div className="grid lg:grid-cols-2 grid-cols-1 items-start justify-between gap-4">
            <div className="mx-auto text-left w-full order-2 md:order-none">
              <h1 className="text-white font-bold lg:text-[59px] md:text-[29px] text-[32px] poppins mb-5 leading-[1.3]">
                Thanks for connecting, you’re in good hands!
              </h1>
              <p className="md:text-[18px] text-[16px] font-normal text-white poppins mb-10">
                Check your email for contact information
              </p>
              <Link href="/contact">
                <Button buttonText="Contact us" />
              </Link>
              <div className="absolute bottom-[-15%] xl:left-[41%] md:left-[35%] left-[26%]">
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

export default ThankYouHeroSection;
