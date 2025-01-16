import React from "react";
import "@/styles/globals.css";
import Image from "next/image";

const PcsResourcesCalculators = () => {
  return (
    <div className="bg-[#E8E8E8] py-12 px-5">
      <div className="container mx-auto">
        <div>
          <h2 className="text-[#003486] tahoma lg:text-[43px] md:text-[43px] sm:text-[31px] text-[31px] font-bold">
            CALCULATORS
          </h2>
        </div>
        <div className="grid lg:grid-cols-3 md:grid-cols-2 sm:grid-cols-1 grid-cols-1 gap-16 mt-10">
          <div>
            <div>
              <Image
                width={1000}
                height={237}
                src="/assets/successful-team1.png"
                alt="check"
                className="w-full h-[356px] object-cover"
              />
              <div className="mt-5">
                <h3 className="text-[#003486] poppins lg:text-[23px] md:text-[23px] sm:text-[17px] text-[17px] font-medium">
                  Moving Calculator
                </h3>
                <p className="text-[#000000] roboto lg:text-[18px] md:text-[18px] sm:text-[13px] text-[13px] font-light mt-1">
                  Utilize our recommended moving calculator to estimate the cost
                  of your move. **Not available for overseas moves**
                </p>
              </div>
            </div>
          </div>
          <div>
            <div>
              <Image
                width={1000}
                height={237}
                src="/assets/successful-team2.png"
                alt="check"
                className="w-full h-[356px]"
              />
              <div className="mt-5">
                <h3 className="text-[#003486] poppins lg:text-[23px] md:text-[23px] sm:text-[17px] text-[17px] font-medium">
                  Mortgage Calculator
                </h3>
                <p className="text-[#000000] roboto lg:text-[18px] md:text-[18px] sm:text-[13px] text-[13px] font-light mt-1">
                  Not sure what your monthly payment will be on a new home loan?
                  Use this calculator to find out!
                </p>
              </div>
            </div>
          </div>
          <div>
            <div>
              <Image
                width={1000}
                height={237}
                src="/assets/successful-team3.png"
                alt="check"
                className="w-full h-[356px]"
              />
              <div className="mt-5">
                <h3 className="text-[#003486] poppins lg:text-[23px] md:text-[23px] sm:text-[17px] text-[17px] font-medium">
                  BAH Calculator
                </h3>
                <p className="text-[#000000] roboto lg:text-[18px] md:text-[18px] sm:text-[13px] text-[13px] font-light mt-1">
                  Calculate the Basic Allowance for Housing (BAH) amount you
                  will receive at your next duty station based on location, pay
                  grade, and dependency status.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PcsResourcesCalculators;
