import React from "react";
import "@/styles/globals.css";
import Image from "next/image";
import Button from "@/components/common/Button";
import Link from "next/link";

type Props = {
  city: string;
  agent_data: AgentData[];
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
};

const StatePageCityAgents = ({ city, agent_data }: Props) => {
  return (
    <div>
      <div className="bg-[#F4F4F4]">
        <div className="container mx-auto md:py-12 sm:py-5 py-5 md:px-0 px-5">
          <div className="text-center">
            <h1 className="text-[#292F6C] text-center tahoma lg:text-[38px] md:text-[38px] sm:text-[22px] text-[22px] font-bold lg:w-[600ox] md:w-[600px] sm:w-full w-full mx-auto">
              {city} Agents
            </h1>
            <div className="bg-[#7E1618] py-[3px] w-24 mx-auto my-5"></div>
          </div>
          <div className="grid lg:grid-cols-2 md:grid-cols-1 sm:grid-cols-1 grid-cols-1 items-start justify-between gap-10 mt-10">
            {agent_data.map((agent) => (
              <div key={agent.Id} className="rounded-[30px] border bg-white shadow-[0px_5px_14px_0px_rgba(8,_15,_52,_0.04)] flex sm:p-8 p-4">
                <div className="justify-center items-center flex flex-col">
                  <div className="rounded-full bg-[#E1EDFB] sm:w-[200px] sm:h-[200px] w-[100px] h-[100px] flex justify-center items-center overflow-hidden mb-4 sm:mb-0">
                    <Image
                      src={agent?.PhotoUrl}
                      alt={`${agent?.Name}'s Profile Picture`}
                      width={1000}
                      height={1000}
                      className="w-auto h-auto object-cover"
                    />
                  </div>
                  <Link href={`/contact-agent?form=agent&fn=${agent.FirstName}&id=${agent.AccountId_15__c}&state=${agent.BillingState}`}>
                    <Button buttonText="Contact Now" />
                  </Link>
                </div>
                <div className="pl-10">
                  <div>
                    <h3 className="text-[#292F6C] tahoma lg:text-[34px] md:text-[34px] sm:text-[24px] text-[24px] font-bold">
                      {agent?.Name}
                    </h3>
                    <p className="text-[#6C757D] tahoma lg:text-[18px] md:text-[18px] sm:text-[14px] text-[14px] font-normal sm:mt-4 mt-0">
                      <b>{agent?.Military_Status__pc}</b>
                      <br></br>
                      NMLS:806490<br></br>{agent?.Military_Service__pc}<br></br>NMLS: 2143
                    </p>
                    <p className="text-[#747D88] tahoma lg:text-[18px] md:text-[18px] sm:text-[14px] text-[14px] font-normal mt-4 line-clamp-3">
                      {agent?.Agent_Bio__pc}
                    </p>
                    <div className="flex justify-end mt-2">
                      <Link
                        href="#"
                        className=" text-[#292F6C] tahoma text-sm font-bold"
                      >
                        Read More
                      </Link>
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
