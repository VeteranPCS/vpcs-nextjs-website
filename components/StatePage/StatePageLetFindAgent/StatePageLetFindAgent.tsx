import React from "react";
import "@/styles/globals.css";
import Image from "next/image";
import Button from "@/components/common/Button";
import Link from "next/link";

const StatePageCityAgents = () => {
  return (
    <div className="bg-[#292F6C]">
      <div className="container mx-auto">
        <div className="flex justify-around flex-wrap items-center sm:p-2 p-2 sm:py-2 py-8">
          <div>
            <h6 className="text-[#FFFFFF] text-enter text-[31px] sm:text-[19px] px-8 text-center sm:text-left sm:font-normal font-bold leading-[34px] sm:leading-none">Don’t see an agent for your area?</h6>
          </div>
          <div className="mt-8 sm:mt-0">
            <Button buttonText="Let us find you an agent" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatePageCityAgents;
