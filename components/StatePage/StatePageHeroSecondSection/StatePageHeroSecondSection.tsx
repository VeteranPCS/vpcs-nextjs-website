import React from "react";
import "@/app/globals.css";
import Image from "next/image";

interface StatePageHeroSecondSectionProps {
  stateName: string;
}

const StatePageHeroSecondSection = ({ stateName }: StatePageHeroSecondSectionProps) => {
  return (
    <div>
      <div className="flex flex-wrap items-start justify-between h-full">
        <div className="bg-[#212557] flex-wrap md:flex-nowrap items-center justify-center w-full h-full md:flex sm:hidden hidden">
          <div className="h-full xl:px-20 lg:px-10 md:px-8 py-10 flex flex-col justify-center items-center mx-auto md:w-[45%]">
            <Image
              src="/icon/VeteranPCSlogo.svg"
              alt="Description of the image"
              width={500}
              height={110}
              className="object-contain w-full max-w-[500px] px-4"
            />
            <p className="text-center text-white tahoma md:text-[16px] font-normal mt-2">
              Your Trusted Veteran &<br></br>
              Military Realtor in {stateName}
            </p>
          </div>
          <div className="bg-[#292F6C] flex flex-col items-center flex-wrap justify-center py-8 w-full h-full md:w-[55%]">
            <div className="flex flex-wrap md:flex-nowrap justify-between items-start xl:px-16 lg:px-8 md:px-6 gap-12 md:gap-8">
              <div className="flex flex-col gap-2 max-w-full">
                <Image
                  src="/icon/userpluswhite.svg"
                  alt="Description of the image"
                  width={45}
                  height={45}
                  className="w-[45px] h-[45px]"
                />
                <h6 className="text-white tahoma md:text-[22px] font-bold">
                  VA Loan Lender
                </h6>
                <p className="text-white tahoma md:text-[14px] font-normal">
                  A team of mortgage lenders who are veterans or military spouses
                  and understand the unique needs and challenges.
                </p>
              </div>
              <div className="flex flex-col gap-2 max-w-full">
                <Image
                  src="/icon/dollar.svg"
                  alt="Description of the image"
                  width={45}
                  height={45}
                  className="w-[45px] h-[45px]"
                />
                <h6 className="text-white tahoma md:text-[22px] font-bold">
                  Don&apos;t Overpay
                </h6>
                <p className="text-white tahoma md:text-[14px] font-normal">
                  Complete clarity and transparency so you do not overpay.
                </p>
              </div>
              <div className="flex flex-col gap-2 max-w-full">
                <Image
                  src="/icon/userswhite.svg"
                  alt="Description of the image"
                  width={45}
                  height={45}
                  className="w-[45px] h-[45px]"
                />
                <h6 className="text-white tahoma md:text-[22px] font-bold">
                  Assistance
                </h6>
                <p className="text-white tahoma md:text-[14px] font-normal">
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
