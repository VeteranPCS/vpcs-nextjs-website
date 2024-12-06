"use client";
import React, { useState, useEffect } from "react";
import "@/styles/globals.css";
import Button from "@/components/common/Button";
import Image from "next/image";
import Link from "next/link";

const HowVetPcsStarted = () => {
  return (
    <div>
      <div className="bg-[#FFFFFF] pt-7 pb-14">
        <div className="container mx-auto">
          <div className="text-center">
            <h6 className="text-gray-800 text-center font-bold text-[21px] tahoma">
              ADMINISTRATION
            </h6>
            <p className="text-[#000000] text-center tahoma font-normal text-[24px] lg:w-[1000px] mx-auto my-3">
              Management of VeteranPCSs resources, people, and time to ensure
              your experience is seamless and an extraordinary move or PCS. 
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-10">
            <div className="border border-[#EAECF0] bg-white w-[417px] mx-auto mt-5">
              <div>
                <Image
                  src="/assets/adminpasteimage.png"
                  alt="Jason"
                  width={417}
                  height={400}
                />
              </div>
              <div className="px-5 py-5">
                <h6 className="text-[#282828] tahoma font-semibold text-2xl mb-1">
                  Beth Soldner
                </h6>
                <span className="text-[#3E3E59] text-lg font-light">
                  Chief Administrative Officer
                </span>
                <p className="text-[#5F6980] text-lg font-light mt-3 mb-3">
                  I’m a wife, mother, and former teacher with a passion for
                  serving others, baking,
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
                  src="/assets/adminpasteimage2.png"
                  alt="Jason"
                  width={417}
                  height={400}
                />
              </div>
              <div className="px-5 py-5">
                <h6 className="text-[#282828] tahoma font-semibold text-2xl mb-1">
                  Stephanie Guree
                </h6>
                <span className="text-[#3E3E59] text-lg font-light">
                  Administrative Manager
                </span>
                <p className="text-[#5F6980] text-lg font-light mt-3 mb-3">
                  I am a wife and mother who chooses daily to see this military
                  life as an adventure.
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
                  src="/assets/adminpasteimage3.png"
                  alt="Jason"
                  width={417}
                  height={400}
                />
              </div>
              <div className="px-5 py-5">
                <h6 className="text-[#282828] tahoma font-semibold text-2xl mb-1">
                  Jessica Brown
                </h6>
                <span className="text-[#3E3E59] text-lg font-light">
                  Administrative Manager
                </span>
                <p className="text-[#5F6980] text-lg font-light mt-3 mb-3">
                  I am a entrepreneur with a love and passion for design,
                  developing and
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
