import React from "react";
import "@/styles/globals.css";
import Image from "next/image";
import Button from "@/components/common/Button";
import Link from "next/link";
import orderMilitaryServiceInfo from "@/utils/getMilitaryServiceInfo";
import { Agent } from "@/services/stateService";

type Props = {
  city: string;
  agent_data: Agent[];
  state: string;
};

export type AgentData = {
  Id: string;
  PhotoUrl: string;
  Name: string;
  Military_Service__pc: string;
  Agent_Bio__pc: string;
  Military_Status__pc: string;
  FirstName: string;
  AccountId_15__c: string;
  BillingState: string;
  BillingCity: string;
  Brokerage_Name__pc: string;
};

function toTitleCase(str: string): string {
  if (!str) return "";

  return str
    .toLowerCase()
    .split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

const StatePageCityAgents = ({ city, agent_data, state }: Props) => {
  console.log(agent_data);
  return (
    // <div id={city.replace(/\s+/g, "-").toLowerCase()}>
    <div id={city.toLowerCase().split(" ").join("-")}>
      <div className="bg-[#F4F4F4]">
        <div className="container mx-auto md:py-12 sm:py-5 py-5 md:px-0 px-5">
          <div className="text-center">
            <h1 className="text-[#292F6C] text-center tahoma lg:text-[38px] md:text-[38px] sm:text-[22px] text-[22px] font-bold lg:w-[600ox] md:w-[600px] sm:w-full w-full mx-auto">
              {city}
            </h1>
            <div className="bg-[#7E1618] py-[3px] w-24 mx-auto my-5"></div>
          </div>
          <div className="grid lg:grid-cols-2 md:grid-cols-1 sm:grid-cols-1 grid-cols-1 items-start justify-between gap-10 mt-10">
            {agent_data.map((agent, index) => (
              <div
                key={agent.AccountId_15__c}
                className="rounded-[30px] border bg-white shadow-[0px_5px_14px_0px_rgba(8,_15,_52,_0.04)] flex sm:p-8 p-4"
              >
                <div className="justify-center items-center flex flex-col">
                  <div className="rounded-full bg-[#E1EDFB] md:w-[200px] md:h-[200px] sm:w-[100px] sm:h-[100px] w-[100px] h-[100px] flex justify-center items-center overflow-hidden mb-4 sm:mb-0">
                    <Image
                      src={agent?.PhotoUrl || ""}
                      alt={`${agent?.Name}'s Profile Picture`}
                      width={1000}
                      height={1000}
                      className="object-cover"
                    />
                  </div>
                  <Link
                    href={`/contact-agent?form=agent&fn=${agent.FirstName}&id=${agent.AccountId_15__c}&state=${state}`}
                  >
                    <Button buttonText="Contact Now" />
                  </Link>
                </div>
                <div className="md:pl-10 sm:pl-4 pl-4">
                  <div>
                    <h3 className="text-[#292F6C] tahoma lg:text-[34px] md:text-[34px] sm:text-[20px] text-[20px] font-bold">
                      {agent?.Name}
                    </h3>
                    <div className="text-[#6C757D] tahoma lg:text-[18px] md:text-[18px] sm:text-[10px] text-[10px] font-normal sm:mt-4 mt-0">
                      <p>
                        {`${agent.BillingAddress?.city ? toTitleCase(agent.BillingAddress?.city) + "," : ""} ${agent.BillingAddress?.state}`}
                      </p>
                      <p className="font-bold">
                        {orderMilitaryServiceInfo(agent?.Military_Status__pc || "", agent?.Military_Service__pc || "")}
                      </p>
                      <p>{agent?.Brokerage_Name__pc}</p>
                    </div>
                    <div className="relative">
                      {/* Hidden checkbox to track toggle state */}
                      <input type="checkbox" id={`toggle-${index + agent.Name}`} className="peer hidden" />

                      {/* Text that expands/collapses */}
                      <p className="text-[#747D88] tahoma lg:text-[18px] md:text-[18px] sm:text-[14px] text-[14px] font-normal mt-4 
      max-h-[80px] overflow-hidden peer-checked:max-h-full transition-all duration-300">
                        {agent?.Agent_Bio__pc}
                      </p>

                      {/* Single label that toggles state */}
                      <label htmlFor={`toggle-${index + agent.Name}`} className="cursor-pointer text-[#292F6C] tahoma text-sm font-bold mt-2 block peer-checked:before:content-['Read_Less'] before:content-['...Read_More']">
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatePageCityAgents;
