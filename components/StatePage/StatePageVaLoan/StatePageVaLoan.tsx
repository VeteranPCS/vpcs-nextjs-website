"use client"
import React from "react";
import "@/styles/globals.css";
import Image from "next/image";
import Button from "@/components/common/Button";
import Link from "next/link";
import { useState } from "react";
import { LendersData, Lenders } from "@/services/stateService";
import orderMilitaryServiceInfo from "@/utils/getMilitaryServiceInfo";

const StatePageVaLoan = ({ cityName, lendersData, state }: { cityName: string, lendersData: LendersData | [], state: string }) => {
  const [expandedIndexes, setExpandedIndexes] = useState<number[]>([]);

  const toggleReadMore = (index: number) => {
    if (expandedIndexes.includes(index)) {
      setExpandedIndexes(expandedIndexes.filter((i) => i !== index));
    } else {
      setExpandedIndexes([...expandedIndexes, index]);
    }
  };

  return (
    <div>
      <div className="container mx-auto md:py-12 sm:py-5 py-5 md:px-0 px-5">
        <div className="text-center">
          <h1 className="text-[#292F6C] text-center tahoma lg:text-[44px] md:text-[44px] sm:text-[31px] text-[31px] font-bold lg:w-[600ox] md:w-[600px] sm:w-full w-full mx-auto">
            {cityName} VA Loan Experts
          </h1>
          <div className="bg-[#7E1618] rounded-full py-1 w-20 mx-auto my-5"></div>
          <p className="text-[#515151] text-center tahoma lg:text-[18px] md:text-[18px] sm:text-[14px] text-[14px] font-normal lg:w-[1300ox] md:w-[1300px] sm:w-full w-full mx-auto">
            VA loan intricacies can be overwhelming. At VeteranPCS, we
            facilitate your connection with specialized VA loan experts, who
            will not only guide you expertly but also ensure that all potential
            benefits are maximized and costly errors are avoided.
          </p>
        </div>
        <div className="grid lg:grid-cols-2 md:grid-cols-1 sm:grid-cols-1 grid-cols-1 items-start justify-between gap-10 mt-10">
          {Array.isArray(lendersData) || !lendersData.records
            ? <p>No lenders available</p>
            : lendersData.records.map((lender: Lenders, index: number) => (
              <div key={lender.AccountId_15__c} className="rounded-[30px] border bg-white shadow-[0px_5px_14px_0px_rgba(8,_15,_52,_0.04)] flex sm:p-8 p-4">
                <div className="justify-center items-center flex flex-col">
                  <div className="rounded-full bg-[#E1EDFB] sm:w-[200px] sm:h-[200px] w-[100px] h-[100px] flex justify-center items-center overflow-hidden mb-4 sm:mb-0">
                    <Image
                      src={lender?.PhotoUrl || ""}
                      alt={`${lender?.Name}'s Profile Picture`}
                      width={1000}
                      height={1000}
                      className="w-auto h-auto object-cover"
                    />
                  </div>
                  <Link href={`/contact-lender?form=lender&fn=${lender.FirstName}&id=${lender.AccountId_15__c}&state=${state}`}>
                    <Button buttonText="Contact Now" />
                  </Link>
                </div>
                <div className="pl-10">
                  <div>
                    <h3 className="text-[#292F6C] tahoma lg:text-[34px] md:text-[34px] sm:text-[24px] text-[24px] font-bold">
                      {lender?.Name}
                    </h3>
                    <div className="text-[#6C757D] tahoma lg:text-[18px] md:text-[18px] sm:text-[14px] text-[14px] font-normal sm:mt-4 mt-0">
                      <p className="font-bold">
                        {orderMilitaryServiceInfo(lender?.Military_Status__pc || "", lender?.Military_Service__pc || "")}
                      </p>
                      <p>NMLS: {lender.Individual_NMLS_ID__pc}</p>
                      <p>{lender.Brokerage_Name__pc}</p>
                      <p>NMLS: {lender.Company_NMLS_ID__pc}</p>
                    </div>
                    <p className={`text-[#747D88] tahoma lg:text-[18px] md:text-[18px] sm:text-[14px] text-[14px] font-normal mt-4
                    ${expandedIndexes.includes(index)
                        ? "line-clamp-none"
                        : "line-clamp-3"}`}>
                      {lender?.Agent_Bio__pc}
                    </p>
                    <div className="flex justify-end mt-2">
                      <button
                        onClick={() => toggleReadMore(index)}
                        className=" text-[#292F6C] tahoma text-sm font-bold"
                      >
                        {expandedIndexes.includes(index) ? "Read Less" : "Read More"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default StatePageVaLoan;
