"use client";
import React from "react"; // No need for useState or useEffect
import "@/styles/globals.css";
import styled from "styled-components";
import Button from "@/components/common/Button";
import classes from "./KeepInTouch.module.css";
import Image from "next/image";
import Link from "next/link";

const KeepInTouch = () => {
  const [isChecked, setIsChecked] = React.useState(false);

  const handleCheckboxChange = () => {
    setIsChecked(!isChecked);
  };
  return (
    <div className="bg-[#EEEEEE] py-12">
      <div className="container mx-auto mb-12">
        <div className="grid lg:grid-cols-2 md:grid-cols-1 sm:grid-cols-1 grid-cols-1 justify-center xl:gap-10 lg:gap-10 md:gap-10 sm:gap-2 gap-2 xl:px-10 lg:px-10 md:px-10 sm:px-3 px-3">
          <div className="lg:text-left md:text-left sm:text-center text-center">
            <div>
              <Image
                width={100}
                height={100}
                className="w-auto h-auto"
                src="/icon/veteran-pcs-logo-white.svg"
                alt="Description of the image"
              />
              <p className="text-[#292F6C] tahoma text-lg font-normal leading-[30px] w-[300px] my-7">
                Together we&apos;ll make it home. Veteran & Military Spouse Real
                Estate Agents and VA Loan Experts You Can Trust
              </p>
            </div>
            <div>
              <ul className="flex items-center gap-4 mt-5">
                <li className="bg-[#A81F23] rounded-[8px] w-8 h-8 p-2 ">
                  <Link href="#">
                    <Image
                      width={100}
                      height={100}
                      src="/icon/dribbble-fill.svg"
                      alt="Description of the image"
                    />
                  </Link>
                </li>
                <li className="bg-[#A81F23] rounded-[8px] w-8 h-8 p-2">
                  <Link href="#">
                    <Image
                      width={100}
                      height={100}
                      src="/icon/instagram-fill.svg"
                      alt="Description of the image"
                    />
                  </Link>
                </li>
                <li className="bg-[#A81F23] rounded-[8px] w-8 h-8 p-2">
                  <Link href="#">
                    <Image
                      width={100}
                      height={100}
                      src="/icon/twitter-fill.svg"
                      alt="Description of the image"
                    />
                  </Link>
                </li>
                <li className="bg-[#A81F23] rounded-[8px] w-8 h-8 p-2">
                  <Link href="#">
                    <Image
                      width={100}
                      height={100}
                      src="/icon/youtube-fill.svg"
                      alt="Description of the image"
                    />
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-5 lg:mt-0 md:mt-0 sm:mt-5">
            <div>
              <h2 className="lg:text-[36px] sm:text-[25px] text-[25px] poppins font-bold text-[#292F6C] lg:text-left md:text-left sm:text-center text-center">
                Keep In Touch
              </h2>
              <p className="text-[#292F6C] font-bold lg:text-[21px] sm:text-[15px] text-[15px] roboto mb-6 lg:text-left md:text-left sm:text-center text-center">
                No spam mail, no fees. VeteranPCS is free to use.
              </p>
              <input
                className={classes.KeepInTouchInput}
                type="text"
                placeholder="First Name*"
              />
              <input
                className={classes.KeepInTouchInput}
                type="text"
                placeholder="Last Name*"
              />
              <input
                className={classes.KeepInTouchInput}
                type="email"
                placeholder="Email*"
              />
              <p className="text-[#292F6C] roboto lg:text-[14px] sm:text-[9px] text-[9px] font-medium mb-3">
                Fields marked with an asterisk (*) are required.
              </p>
              <div className="flex items-center">
                <div className="bg-[#F9F9F9] rounded-[3px] border border-[#D3D3D3] py-5 px-5 mr-5 w-[200px]">
                  <div className={classes.CheckboxContainer}>
                    <input
                      className={classes.CustomCheckbox}
                      checked={isChecked}
                      onClick={handleCheckboxChange}
                    />
                    <div className={classes.CheckboxLabel}>I&apos;m not a robot</div>
                  </div>
                </div>
                <div>
                  <Button buttonText="Submit" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KeepInTouch;
