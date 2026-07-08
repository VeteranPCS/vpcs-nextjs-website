import React from "react";
import Image from "next/image";
import Link from "next/link";
import StatePageWhyChooseVetpcsComp from "@/components/StatePage/StatePageWhyChooseVetpcs/StatePageWhyChooseVetpcscomp";

const cardsData = [
  {
    img: "/icon/checkwhite.svg",
    title: "Charities",
    subTitle: "10% back to Veteran focused charities",
  },
  {
    img: "/icon/checkwhite.svg",
    title: "Network",
    subTitle: "Expansive Veteran & Mil Spouse Network",
  },
  {
    img: "/icon/checkwhite.svg",
    title: "Free",
    subTitle: "No Strings, Completely Free to Use Services",
  },
  {
    img: "/icon/checkwhite.svg",
    title: "Bonus",
    subTitle: "RECEIVE CASHBACK OF $200 - $4,000 AT CLOSING",
  },

];


const StatePageWhyChooseVetpcs = ({ cityName }: { cityName: string }) => {

  return (
    <div className="container mx-auto md:py-12 py-5 md:px-0 px-5">
      <div className="text-center">
        <h2 className="text-[#292F6C] text-center md:text-[44px] text-[31px] font-bold md:w-[600px] w-full mx-auto">
          {cityName}
        </h2>
        <p className="text-center text-[#292F6C] md:text-[18px] text-[14px] font-normal">
          Why choose VeteranPCS as Your Preferred Real Estate Agents?
        </p>
      </div>
      <div
        className="grid xl:grid-cols-4 md:grid-cols-2 grid-cols-1 sm:mt-10 mt-5 justify-center md:gap-10 gap-2 md:px-10 px-3"
        data-aos="fade-left"
        data-aos-duration="1000"
      >
        {cardsData.map((card, index) => (
          <StatePageWhyChooseVetpcsComp
            key={index}
            card={card}
          />
        ))}
      </div>
    </div>
  );
};

export default StatePageWhyChooseVetpcs;
