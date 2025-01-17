import React from "react";
import "@/styles/globals.css";
import Image from "next/image";

interface StatePageHeroSecondSectionProps {
  stateName: string;
}

const StatePageHeroSecondSection = ({ stateName }: StatePageHeroSecondSectionProps) => {
  return (
    <div>
      <div className="flex flex-wrap items-start justify-between h-full">
        <div className="bg-[#212557] flex-wrap sm:flex-wrap md:flex-wrap lg:flex-nowrap items-center justify-center w-full h-full lg:flex sm:hidden hidden">
          <div className="h-full xl:px-20 lg:px-10 sm:py-10 py-10 flex flex-col justify-center items-center mx-auto">
            <Image
              src="/icon/VeteranPCSlogo.svg"
              alt="Description of the image"
              width={300}
              height={300}
              className="object-cover px-4 lg:min-w-[150px] mx-auto"
            />
            <p className="text-center text-white tahoma lg:text-[19px] md:text-[19px] sm:text-[18px] text-[18px] font-normal mt-4">
              Your Trusted Veteran &<br></br>
              Military Realtor in {stateName}
            </p>
          </div>
          <div className="bg-[#292F6C] flex flex-col items-center flex-wrap justify-center py-10 w-full h-full">
            <div className="flex flex-wrap md:flex-nowrap justify-between items-center xl:px-20 lg:px-10 gap-20 md:gap-10">
              <div className="flex flex-col gap-4 max-w-full">
                <Image
                  src="/icon/userpluswhite.svg"
                  alt="Description of the image"
                  width={1000}
                  height={1000}
                  className="w-[63px] h-[53px]"
                />
                <h6 className="text-white tahoma lg:text-[30px] md:text-[30px] sm:text-[20px] text-[20px] font-bold">
                  Mortgage Lender
                </h6>
                <p className="text-white tahoma lg:text-[16px] md:text-[16px] sm:text-[12px] text-[12px] font-normal">
                  A team of mortgage lenders who are veterans or military spouses
                  and understand the unique needs and challenges.
                </p>
              </div>
              <div className="flex flex-col gap-4 max-w-full">
                <Image
                  src="/icon/dollar.svg"
                  alt="Description of the image"
                  width={1000}
                  height={1000}
                  className="w-[63px] h-[53px]"
                />
                <h6 className="text-white tahoma lg:text-[30px] md:text-[30px] sm:text-[20px] text-[20px] font-bold">
                  Don’t Overpay
                </h6>
                <p className="text-white tahoma lg:text-[16px] md:text-[16px] sm:text-[12px] text-[12px] font-normal">
                  Complete clarity and transparency so you do not overpay.
                </p>
              </div>
              <div className="flex flex-col gap-4 max-w-full">
                <Image
                  src="/icon/userswhite.svg"
                  alt="Description of the image"
                  width={1000}
                  height={1000}
                  className="w-[63px] h-[53px]"
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
    </div>
  );
};

export default StatePageHeroSecondSection;
