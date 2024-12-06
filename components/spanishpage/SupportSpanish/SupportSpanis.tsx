"use client";
import React from "react"; // No need for useState or useEffect
import "@/styles/globals.css";
import styled from "styled-components";
import Button from "@/components/common/Button";
import Image from "next/image";

const SupportSpanish = () => {
  return (
    <div className="w-full py-10">
      <div>
        <div className="container mx-auto w-full">
          <div
            className="px-4 bg-[#ffffff] mx-auto text-center"
            data-aos="fade-right"
            data-aos-duration="1000"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 justify-between items-start mt-10">
              <div className="lg:text-left sm:text-center text-center flex flex-col gap-4 justify-between">
                <div>
                  <h2 className="text-[#292F6C] font-bold xl:text-[42px] lg:text-[40px] sm:text-[31px] text-[31px] tahoma">
                    We support our veterans & military spouses
                  </h2>
                </div>
                <div>
                  <p className="text-[#161C2D] text-[20px] font-normal leading-[42px] tahoma">
                    We charge no monthly fees for agents on the site, when you
                    use this site you are helping a veteran or military spouse
                    grow their business
                  </p>
                </div>
                <div className="flex justify-start">
                  <Button buttonText="Connect now!" />
                </div>
              </div>
              <div>
                <div className="flex gap-4 items-center">
                  <Image
                    width={1000}
                    height={1000}
                    className="w-auto h-auto"
                    src="/assets/military-image-2.png"
                    alt="Move in bonus"
                  />
                </div>
              </div>
              <div className="lg:text-left sm:text-center text-center flex flex-col gap-7 justify-between lg:ml-5 md:ml-5 sm:ml-0 ml-0">
                <div>
                  <h2 className="text-[#292F6C] font-bold lg:text-[40px] sm:text-[31px] text-[31px] tahoma">
                    We support <br></br>a cause
                  </h2>
                </div>
                <div>
                  <p className="text-[#161C2D] text-[20px] font-normal leading-[42px] tahoma">
                    10% of all proceeds go directly back to veteran outreach
                    programs as well as international non-profits that are
                    making a difference in war-stricken areas around the globe.
                  </p>
                </div>
                <div className="flex justify-start">
                  <Button buttonText="Our Impact" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupportSpanish;
