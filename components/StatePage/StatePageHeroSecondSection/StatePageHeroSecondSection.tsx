import React from "react";
import "@/styles/globals.css";
import Image from "next/image";
import Link from "next/link";

const StatePageHeroSecondSection = () => {
  return (
    <div>
      <div className="flex flex-wrap items-start justify-between h-full">
        <div className="bg-[#212557] flex flex-col items-center justify-center py-[69px] lg:w-1/4 md:w-1/4 sm:w-full w-full h-full">
          <div>
            <Image
              src="/icon/VeteranPCSlogo.svg"
              alt="Description of the image"
              width={1000}
              height={1000}
              className="w-auto h-auto object-cover"
            />
            <p className="text-center text-white tahoma lg:text-[21px] md:text-[21px] sm:text-[18px] text-[18px] font-normal mt-4">
              Your Trusted Veteran &<br></br>
              Military Realtor in South Carolina
            </p>
          </div>
        </div>
        <div className="bg-[#292F6C] flex flex-col items-center flex-wrap justify-center py-10 lg:w-3/4 md:w-3/4 sm:w-full w-full h-full">
          <div className="flex flex-wrap md:flex-nowrap justify-between items-center px-20 gap-20">
            <div className="flex flex-col gap-4">
              <Image
                src="/icon/userpluswhite.svg"
                alt="Description of the image"
                width={1000}
                height={1000}
                className="w-[70px] h-[60px]"
              />
              <h6 className="text-white tahoma lg:text-[30px] md:text-[30px] sm:text-[20px] text-[20px] font-bold">
                Mortgage Lender
              </h6>
              <p className="text-white tahoma lg:text-[16px] md:text-[16px] sm:text-[12px] text-[12px] font-normal">
                A team of mortgage lenders who are veterans or military spouses
                and understand the unique needs and challenges.
              </p>
            </div>
            <div className="flex flex-col gap-4">
              <Image
                src="/icon/dollar.svg"
                alt="Description of the image"
                width={1000}
                height={1000}
                className="w-[70px] h-[60px]"
              />
              <h6 className="text-white tahoma lg:text-[30px] md:text-[30px] sm:text-[20px] text-[20px] font-bold">
                Don’t Overpay
              </h6>
              <p className="text-white tahoma lg:text-[16px] md:text-[16px] sm:text-[12px] text-[12px] font-normal">
                Complete clarity and transparency so you do not overpay.
              </p>
            </div>
            <div className="flex flex-col gap-4">
              <Image
                src="/icon/userswhite.svg"
                alt="Description of the image"
                width={1000}
                height={1000}
                className="w-[70px] h-[60px]"
              />
              <h6 className="text-white tahoma lg:text-[30px] md:text-[30px] sm:text-[20px] text-[20px] font-bold">
                Assistance
              </h6>
              <p className="text-white tahoma lg:text-[16px] md:text-[16px] sm:text-[12px] text-[12px] font-normal">
                Get assistance to handle complex paperwork and communicate
                smoothly with all parties involved.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatePageHeroSecondSection;
