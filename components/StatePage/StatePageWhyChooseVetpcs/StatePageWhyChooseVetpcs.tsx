import React from "react";
import "@/styles/globals.css";
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
    <div className="container mx-auto md:py-12 sm:py-5 py-5 md:px-0 px-5">
      <div className="text-center">
        <h1 className="text-[#292F6C] text-center tahoma lg:text-[44px] md:text-[44px] sm:text-[31px] text-[31px] font-bold lg:w-[600ox] md:w-[600px] sm:w-full w-full mx-auto">
          {cityName}
        </h1>
        <p className="text-center text-[#292F6C] tahoma lg:text-[18px] md:text-[18px] sm:text-[14px] text-[14px] font-normal">
          Why choose VeteranPCS as Your Preferred Real Estate Agents
        </p>
      </div>
      <div
        className="grid lg:grid-cols-4 md:grid-cols-3 sm:grid-cols-1 grid-cols-1 lg:mt-10 md:mt-10 sm:mt-10 mt-5 justify-center xl:gap-10 lg:gap-10 md:gap-10 sm:gap-2 gap-2 xl:px-10 lg:px-10 md:px-10 sm:px-3 px-3"
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
