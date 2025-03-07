import React, { useState, useEffect } from "react";
import "@/styles/globals.css";
import VeteranPCSWorksComp from "./VeteranPCSWorksComp";

const cardsData = [
  {
    img: "/icon/checkred.svg",
    title: "AGENTS",
    subTitle:
      "Find a veteran or military spouse real estate agent to help buy or sell a home.",
    link: "#map-container",
  },
  {
    img: "/icon/checkred.svg",
    title: "VA LOAN",
    subTitle:
      "Don’t overpay when using your va loan. Our va loan experts are here to help.",
    link: "#map-container",
  },
  {
    img: "/icon/checkred.svg",
    title: "Bonus",
    subTitle: "Get cash back when you close on a home. $200-$4,000.",
    link: "how-it-works",
  },
];

const VeteranPCS = () => {
  return (
    <div className="bg-[#F4F4F4]">
      <div className="container mx-auto w-full lg:py-16 md:py-10 sm:py-10 py-5">
        <div className="px-10 sm:px-4 mx-auto text-center">
          <div className="space-y-4">
            <h2 className="text-[#292F6C] font-bold lg:text-3xl md:text-2xl text-xl tahoma">
              How VeteranPCS Works
            </h2>
            <p className="text-[#292F6C] lg:text-2xl md:text-xl text-base leading-8 poppins">
              VeteranPCS is FREE for anyone to use.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap justify-center mt-10 lg:gap-10 md:gap-6 sm:gap-2 gap-2 lg:px-10 md:px-10 sm:px-3 px-3 mx-auto">
          {cardsData.map((card, index) => (
            <VeteranPCSWorksComp key={index} veteranpcs={card} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default VeteranPCS;
