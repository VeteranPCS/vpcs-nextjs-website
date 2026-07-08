import React from "react";
import VeteranPCSWorksComp from "./VeteranPCSWorksComp";

const cardsData = [
  {
    img: "/icon/Agents.svg",
    title: "AGENTS",
    subTitle:
      "Find a veteran or military spouse real estate agent to help buy or sell a home.",
    link: "#state-map",
  },
  {
    img: "/icon/Loan.svg",
    title: "VA LOAN",
    subTitle:
      "Don’t overpay when using your VA loan. Our VA loan experts are here to help.",
    link: "/va-loan-help",
  },
  {
    img: "/icon/Moveinbonus.svg",
    title: "Bonus",
    subTitle: "Get cash back when you close on a home. $200-$4,000.",
    link: "how-it-works",
  },
];

const VeteranPCS = () => {
  return (
    <div className="bg-surface">
      <div className="container mx-auto w-full py-16 md:py-24">
        <div className="px-4 mx-auto text-center">
          <div className="space-y-4">
            <h2 className="text-[#292F6C] font-bold lg:text-3xl md:text-2xl text-xl">
              How VeteranPCS Works
            </h2>
            <p className="text-[#292F6C] lg:text-2xl md:text-xl text-base leading-8 poppins">
              VeteranPCS is FREE for anyone to use.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap justify-center items-stretch mt-10 gap-6 md:gap-8 px-4 mx-auto">
          {cardsData.map((card, index) => (
            <VeteranPCSWorksComp key={index} veteranpcs={card} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default VeteranPCS;
