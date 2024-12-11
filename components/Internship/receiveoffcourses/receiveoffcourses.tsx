import React from "react"; // No need for useState or useEffect
import "@/styles/globals.css";
import Button from "@/components/common/Button";

const SkillFuturesBuild = () => {
  return (
    <div className="w-full">
      <div className="bg-[#002258] lg:py-12 sm:py-5 py-5 lg:px-0 px-5">
        <div className="container mx-auto ">
          <div className="">
            <div className="text-center">
              <h1 className="text-white lg:text-[32px] md:text-[32px] sm:text-[32px] text-[32px] font-bold poppins lg:w-[800px] md:w-[800px] sm:w-full w-full mx-auto">
                Receive 40% off Pre-Licensing Courses
              </h1>
              <p className="text-[#FFFFFF] text-center roboto lg:text-lg md:text-lg sm:text-sm text-sm font-medium lg:w-[900px] md:w-[900px] sm:w-full w-full mx-auto pt-5">
                VeteranPCS has partnered with the CE Shop to offer a 40%
                discount to get your real estate license. Discount is available
                for active duty, veterans, and military spouses.
              </p>
              <Button buttonText="40% off training" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SkillFuturesBuild;
