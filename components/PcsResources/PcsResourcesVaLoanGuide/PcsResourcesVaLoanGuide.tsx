"use client";
import React, { useState } from "react";
import "@/styles/globals.css";
import Link from "next/link";
import classes from "./PcsResourcesVaLoanGuide.module.css";
import Image from "next/image";

const PcsResourcesVaLoanGuide = () => {
  const [isChecked, setIsChecked] = useState<boolean>(false);

  const handleCheckboxChange = () => {
    setIsChecked(!isChecked);
  };
  return (
    <div className={classes.pcsresourcesvaloanguide}>
      <div className="container mx-auto px-5">
        <div className="grid lg:grid-cols-2 md:grid-cols-1 sm:grid-cols-1 grid-cols-1 items-start justify-between gap-6">
          <div className="lg:px-20 mg:px-20 sm:px-10 px-10">
            <div className="text-center">
              <h2 className="text-[#FFFFFF] text-center poppins lg:text-[36px] md:text-[36px] sm:text-[22px] text-[22px] font-bold">
                VA Loan Guide
              </h2>
              <p className="text-[#FFFFFF] text-center roboto lg:text-[21px] md:text-[21px] sm:text-[16px] text-[16px] font-medium lg:w-[550px] mx-auto mt-4 mb-10">
                Important considerations on income and orders when you&apos;re
                planning your next move.
              </p>
            </div>
            <div className="grid lg:grid-cols-2 md:grid-cols-1 sm:grid-cols-1 grid-cols-1 gap-4 mt-10">
              <div>
                <input
                  className={classes.KeepInTouchInput}
                  type="text"
                  placeholder="First Name*"
                />
              </div>
              <div>
                <input
                  className={classes.KeepInTouchInput}
                  type="text"
                  placeholder="Last Name*"
                />
              </div>
              <div>
                <input
                  className={classes.KeepInTouchInput}
                  type="email"
                  placeholder="Email*"
                />
              </div>
            </div>
            <div className="flex items-center">
              <div className="bg-[#F9F9F9] rounded-[3px] border border-[#D3D3D3] py-5 px-5 mr-5 w-[200px]">
                <div className={classes.CheckboxContainer}>
                  <input
                    className={classes.CustomCheckbox}
                    checked={isChecked}
                    onClick={handleCheckboxChange}
                  />
                  <div className={classes.CheckboxLabel}>
                    I&rsquo;m not a robot
                  </div>
                </div>
              </div>
            </div>
            <div>
              <button className="border-2 border-white rounded-md text-center block w-full py-3 text-white roboto lg:text-[20px] md:text-[20px] sm:text-[14px] text-[14px] font-medium mt-8 mb-3">
                Download For Free
              </button>
            </div>
            <div className="text-center">
              <Link
                href="#"
                className="text-white text-center roboto lg:text-[14px ] md:text-[14px] sm:text-[12px] text-[12px] font-medium"
              >
                Fields marked with an asterisk (*) are required.
              </Link>
            </div>
          </div>
          <div>
            <Image
              width={567}
              height={567}
              src="/assets/military-meet.png"
              alt="check"
              className="lg:w-[567px] lg:h-[567px] md:w-[567px] md:h-[567px] sm:w-full sm:h-full w-full h-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PcsResourcesVaLoanGuide;
