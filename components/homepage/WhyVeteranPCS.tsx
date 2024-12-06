"use client";
import React from "react"; // No need for useState or useEffect
import "@/styles/globals.css";
import Button from "@/components/common/Button";
import Image from "next/image";

const WhyVeteranPcs = () => {
  return (
    <div className="w-full py-10 bg-[#F4F4F4]">
      <div>
        <div className="container mx-auto w-full">
          <div className="px-4 mx-auto text-center">
            <div>
              <h2 className="text-[#292F6C] font-bold lg:text-[40px] sm:text-[31px] text-[31px] tahoma">
                Why VeteranPCS
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 justify-between items-center mt-10">
              <div className="lf:text-left sm:text-center text-center">
                <div className="flex gap-4 lg:justify-start sm:justify-center justify-center items-center">
                  <Image
                    width={100}
                    height={100}
                    className="w-auto h-auto"
                    src="/icon/Moveinbonus.svg"
                    alt="Move in bonus"
                  />
                  <h3 className="text-[#003486] font-bold lg:text-[30px] md:text-[25px] sm:text-[25px] text-[25px] leading-[28px] poppins">
                    MOVE IN BONUS
                  </h3>
                </div>
                <div className="flex gap-4 lg:justify-start sm:justify-center justify-center items-center my-16">
                  <Image
                    width={100}
                    height={100}
                    className="w-auto h-auto"
                    src="/icon/checkblue.svg"
                    alt="Move in bonus"
                  />
                  <h3 className="text-[#003486] font-bold lg:text-[30px] md:text-[25px] sm:text-[20px] text-[16px] leading-[28px] poppins">
                    FREE TO USE
                  </h3>
                </div>
                <div className="flex gap-4 lg:justify-start sm:justify-center justify-center items-center">
                  <Image
                    width={100}
                    height={100}
                    className="w-auto h-auto"
                    src="/icon/giveback.svg"
                    alt="Move in bonus"
                  />
                  <h3 className="text-[#003486] font-bold lg:text-[30px] md:text-[25px] sm:text-[20px] text-[16px] leading-[28px] poppins">
                    GIVE BACK
                  </h3>
                </div>
              </div>
              <div>
                <div className="flex gap-4 items-center">
                  <Image
                    width={465}
                    height={465}
                    className="w-full h-full"
                    src="/assets/veteranPCS-slider-checks-03.png"
                    alt="Move in bonus"
                  />
                </div>
              </div>
              <div className="mx-auto">
                <div className="flex gap-4 lg:justify-start sm:justify-center justify-center items-center">
                  <Image
                    width={100}
                    height={100}
                    className="w-auto h-auto"
                    src="/icon/valoanexperts.svg"
                    alt="Move in bonus"
                  />
                  <h3 className="text-[#003486] font-bold lg:text-[30px] md:text-[25px] sm:text-[20px] text-[16px] leading-[28px] poppins">
                    VA LOAN EXPERTS
                  </h3>
                </div>
                <div className="flex gap-4 lg:justify-start sm:justify-center justify-center items-center my-16">
                  <Image
                    width={100}
                    height={100}
                    className="w-auto h-auto"
                    src="/icon/support.svg"
                    alt="Move in bonus"
                  />
                  <h3 className="text-[#003486] font-bold lg:text-[30px] md:text-[25px] sm:text-[20px] text-[16px] leading-[28px] poppins">
                    SUPPORT
                  </h3>
                </div>
                <div className="flex gap-4 lg:justify-start sm:justify-center justify-center items-center">
                  <Image
                    width={100}
                    height={100}
                    className="w-auto h-auto"
                    src="/icon/agents.svg"
                    alt="Move in bonus"
                  />
                  <h3 className="text-[#003486] font-bold lg:text-[30px] md:text-[25px] sm:text-[20px] text-[16px] leading-[28px] poppins">
                    AGENTS
                  </h3>
                </div>
              </div>
            </div>
            <div className="mx-auto justify-center text-center flex">
              <Image
                width={100}
                height={100}
                className="w-auto h-auto"
                src="/icon/vet-PCS-5-star-review.svg"
                alt="Move in bonus"
              />
            </div>
            <div className="mx-auto justify-center text-center flex">
              <Button buttonText="Find an Agent" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WhyVeteranPcs;
