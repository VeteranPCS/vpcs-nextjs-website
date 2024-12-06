"use client";
import React, { useState, useEffect } from "react";
import "@/styles/globals.css";
import Button from "@/components/common/Button";
import Image from "next/image";
import Link from "next/link";

const HowVetPcsStarted = () => {
  return (
    <div className="bg-white py-3">
      <div className="mt-10">
        <h1 className="text-[#292F6C] text-center font-tahoma lg:text-[55px] md:text-[60px] sm:text-[40px] text-[40px] font-bold">
          Meet the <span className="font-normal">Veteran</span>PCS team
        </h1>
      </div>
      <div className="bg-[#EEEEEE] pt-7 pb-14">
        <div className="container mx-auto">
          <div className="text-center">
            <h6 className="text-gray-800 text-center font-bold text-[21px] tahoma">
              DIGITAL INNOVATION AND TECH
            </h6>
            <p className="text-[#000000] text-center tahoma font-normal text-[24px] lg:w-[1000px] mx-auto my-3">
              Immersive creative experiences, sophisticated marketing and
              innovative technology for our customers safety and substantial
              user experience.{" "}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-10">
            <div className="border border-[#EAECF0] bg-white w-[417px] mx-auto mt-5">
              <div>
                <Image
                  src="/assets/digitalpasteimage.png"
                  alt="Jason"
                  width={417}
                  height={400}
                />
              </div>
              <div className="px-5 py-5">
                <h6 className="text-[#282828] tahoma font-semibold text-2xl mb-1">
                  Stephanie Camfield
                </h6>
                <span className="text-[#3E3E59] text-lg font-light">
                  Chief Creative Officer
                </span>
                <p className="text-[#5F6980] text-lg font-light mt-3 mb-3">
                  I am a design enthusiast with a passion for working with
                  companies that have a
                </p>
                <Link
                  href="#"
                  className="text-[#292F6C] text-lg font-bold tahoma mt-4"
                >
                  Read More
                </Link>
              </div>
            </div>
            <div className="border border-[#EAECF0] bg-white w-[417px] mx-auto mt-5">
              <div>
                <Image
                  src="/assets/digitalpasteimage2.png"
                  alt="Jason"
                  width={417}
                  height={400}
                />
              </div>
              <div className="px-5 py-5">
                <h6 className="text-[#282828] tahoma font-semibold text-2xl mb-1">
                  Harper Foley
                </h6>
                <span className="text-[#3E3E59] text-lg font-light">
                  Chief Technology Officer
                </span>
                <p className="text-[#5F6980] text-lg font-light mt-3 mb-3">
                  I am an entrepreneurial full-stack engineer driven by a
                  passion for
                </p>
                <Link
                  href="#"
                  className="text-[#292F6C] text-lg font-bold tahoma mt-4"
                >
                  Read More
                </Link>
              </div>
            </div>
            <div className="border border-[#EAECF0] bg-white w-[417px] mx-auto mt-5">
              <div>
                <Image
                  src="/assets/digitalpasteimage3.png"
                  alt="Jason"
                  width={417}
                  height={400}
                />
              </div>
              <div className="px-5 py-5">
                <h6 className="text-[#282828] tahoma font-semibold text-2xl mb-1">
                  Michelle Bowler
                </h6>
                <span className="text-[#3E3E59] text-lg font-light">
                  Social Media Strategist
                </span>
                <p className="text-[#5F6980] text-lg font-light mt-3 mb-3">
                  There are many variations of passages of Lorem Ipsum available
                </p>
                <Link
                  href="#"
                  className="text-[#292F6C] text-lg font-bold tahoma mt-4"
                >
                  Read More
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HowVetPcsStarted;
