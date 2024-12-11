import React, { useState, useEffect } from "react";
import "@/styles/globals.css";
import VeteranPCSWorksComp from "./VeteranPCSWorksComp";

const cardsData = [
  {
    img: "/icon/checkred.svg",
    title: "AGENTS",
    subTitle:
      "Find a veteran or military spouse real estate agent to help buy or sell a home.",
    link: "Learn more here >",
  },
  {
    img: "/icon/checkred.svg",
    title: "VA LOAN",
    subTitle:
      "Don’t overpay when using your va loan.  Our va loan experts are here to help.",
    link: "blog-list/va-loan-eligibility-requirements-how-to-know-if-you-qualify-for-a-va-loan-or-veteranpcs",
  },
  {
    img: "/icon/checkred.svg",
    title: "Bonus",
    subTitle: "Get cash back when you close on a home. $200-$4,000.",
    link: "Learn more here >",
  },
];

const VeteranPCS = () => {
  return (
    <div className="bg-[#F4F4F4]">
      <div className="container mx-auto w-full lg:py-16 md:py-10 sm:py-10 py-5">
        <div className="px-10 sm:px-4 mx-auto text-center">
          <div>
            <h2 className="text-[#292F6C] font-bold lg:text-[48px] md:text-[35px] sm:text-[31px] text-[31px] tahoma">
              How VeteranPCS Works
            </h2>
            <p className="normal text-[#292F6C] lg:text-[18px] md:text-[19px] sm:text-[16px] text-[16px] leading-[32px] font-normal poppins">
              VeteranPCS is FREE for anyone to use.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap justify-center mt-10 xl:gap-11 lg:gap-10 md:gap-10 sm:gap-2 gap-2 xl:px-10 lg:px-10 md:px-10 sm:px-3 px-3 mx-auto">
          {cardsData.map((card, index) => (
            <VeteranPCSWorksComp key={index} veteranpcs={card} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default VeteranPCS;
