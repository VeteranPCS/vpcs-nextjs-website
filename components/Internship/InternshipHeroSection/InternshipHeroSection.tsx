import React from "react";
import "@/app/globals.css";
import classes from "./InternshipHeroSection.module.css";
import Image from "next/image";
import Button from "@/components/common/Button";
import Link from "next/link";

const PcsResources = () => {
  return (
    <div className="relative">
      <div className={classes.internshipherosectioncontainer}>
        <div className="container mx-auto px-5">
          <div className="grid lg:grid-cols-2 grid-cols-1 items-start justify-between gap-4">
            <div className="mx-auto text-left w-full order-2 md:order-none">
              <h1 className="text-white font-bold lg:text-[59px] md:text-[29px] text-[32px] poppins mb-5 tahoma leading-[1.3] lg:w-[700px] md:w-[500px] w-full">
                Kickstart Your Career in Real Estate!
              </h1>
              <p className="md:text-[18px] text-[16px] font-normal text-white poppins mb-10 tahoma lg:w-[650px] md:w-[500px] w-full">
                Interested in becoming a real estate agent or loan officer?
                VeteranPCS can help you set up an Individual Internship with one
                of the many agents or lenders on our website
              </p>
              <div>
                <Link href="/kick-start-your-career">
                  <Button buttonText="Internship Application" />
                </Link>
              </div>
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

export default PcsResources;
