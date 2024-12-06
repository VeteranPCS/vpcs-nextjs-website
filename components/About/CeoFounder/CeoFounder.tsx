"use client";
import React, { useState, useEffect } from "react";
import "@/styles/globals.css";
import Button from "@/components/common/Button";
import Image from "next/image";
import Link from "next/link";

const HowVetPcsStarted = () => {
  return (
    <div className="pt-14">
      <div>
        <div className="container mx-auto">
          <div className=" mx-auto">
            <div>
              <span className="text-[#282828] flex justify-center tahoma text-[21px] font-bold">
                CEO & FOUNDER
              </span>
            </div>
            <div>
              <h1 className="text-[#292F6C] font-bold text-center tahoma lg:text-[55px] md:text-[60px] sm:text-[40px] text-[40px] ">
                Meet Our Founder
              </h1>
            </div>
            <div>
              <p className="text-[#000000] text-center tahoma font-normal text-[24px] lg:w-[1000px] mx-auto">
                VeteranPCS was created to be different. A site dedicated to
                equally serving the agents as much as the military families
                going through a PCS or move.
              </p>
            </div>
            <div className="border border-[#EAECF0] bg-white w-[417px] mx-auto mt-5">
              <div>
                <Image
                  src="/assets/CeoPasteimage.png"
                  alt="Jason"
                  width={417}
                  height={400}
                />
              </div>
              <div className="px-5 py-5">
                <h6 className="text-black tahoma font-semibold text-2xl">
                  Jason Anderson
                </h6>
                <span className="text-[#3E3E59] text-lg font-light">
                  Founder & CEO
                </span>
                <p className="text-[#5F6980] text-lg font-light mt-3 mb-3">
                  I am a lifelong learner, passionate about my family and
                  friends, the outdoors,
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
