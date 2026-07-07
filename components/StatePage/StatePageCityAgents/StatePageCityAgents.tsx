"use client";

import React, { useEffect, useRef, useState } from "react";
import "@/app/globals.css";
import Image from "next/image";
import Button from "@/components/common/Button";
import Link from "next/link";
import orderMilitaryServiceInfo from "@/utils/getMilitaryServiceInfo";
import { sanitizeCityName } from "@/utils/sanitizeCityName";
import { Agent } from "@/services/stateService";
import { trackCtaClicked } from "@/lib/analytics/client";

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

const AgentBio = ({ bio }: { bio: string }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = textRef.current;
    if (!el) return;

    // Compare against the fixed 80px collapse threshold (not clientHeight) so
    // the result is independent of expanded/collapsed state — clientHeight
    // equals scrollHeight while expanded, which would otherwise hide the
    // toggle mid-interaction.
    const remeasure = () => {
      setIsOverflowing(el.scrollHeight > 80);
    };

    remeasure();

    const observer = new ResizeObserver(remeasure);
    observer.observe(el);

    return () => observer.disconnect();
  }, [bio]);

  return (
    <div className="relative">
      <p
        ref={textRef}
        className={`text-[#747D88] tahoma lg:text-[18px] md:text-[18px] sm:text-[14px] text-[14px] font-normal mt-4 overflow-hidden transition-all duration-300 ${isExpanded ? "max-h-full" : "max-h-[80px]"}`}
      >
        {bio}
      </p>
      {isOverflowing && (
        <button
          type="button"
          aria-expanded={isExpanded}
          onClick={() => setIsExpanded((prev) => !prev)}
          className="cursor-pointer text-[#292F6C] tahoma text-sm font-bold mt-2 min-h-11 inline-flex items-center"
        >
          {isExpanded ? "Read Less" : "...Read More"}
        </button>
      )}
    </div>
  );
};


const StatePageCityAgents = ({ city, agent_data, state }: Props) => {
  const trackAgentCta = (agentId: string, position: string) => {
    trackCtaClicked({
      cta_id: 'state_agent_card_contact',
      cta_intent: 'contact_agent',
      cta_position: position,
      cta_component: 'state_agent_card',
      destination_path: '/contact-agent',
      state_slug: state,
      partner_type: 'agent',
      partner_salesforce_id: agentId,
    });
  };

  return (
    <div id={sanitizeCityName(city)}>
      <div className="bg-[#F4F4F4]">
        <div className="container mx-auto md:py-12 py-5 md:px-0 px-5">
          <div className="text-center">
            <h2 className="text-[#292F6C] text-center tahoma md:text-[38px] text-[22px] font-bold md:w-[600px] w-full mx-auto">
              {city}
            </h2>
            <div className="bg-[#7E1618] py-[3px] w-24 mx-auto my-5"></div>
          </div>
          <div className="grid lg:grid-cols-2 grid-cols-1 items-start justify-between gap-10 mt-10">
            {agent_data.map((agent) => (
              <div
                key={agent.AccountId_15__c}
                className="rounded-[30px] border bg-white shadow-[0px_5px_14px_0px_rgba(8,_15,_52,_0.04)] flex sm:p-8 p-4"
              >
                <div className="justify-center items-center flex flex-col">
                  <div className="rounded-full bg-[#E1EDFB] md:w-[200px] md:h-[200px] w-[100px] h-[100px] flex justify-center items-center overflow-hidden mb-4 sm:mb-0">
                    <Link
                      href={`/contact-agent?form=agent&fn=${agent.FirstName}&id=${agent.AccountId_15__c}&state=${state}`}
                      onClick={() => trackAgentCta(agent.AccountId_15__c, 'card_image')}
                    >
                      <Image
                        src={agent?.PhotoUrl || ""}
                        alt={`${agent?.Name}'s Profile Picture`}
                        width={1000}
                        height={1000}
                        sizes="(min-width: 768px) 200px, 100px"
                        className="object-cover"
                      />
                    </Link>
                  </div>
                  <Link
                    href={`/contact-agent?form=agent&fn=${agent.FirstName}&id=${agent.AccountId_15__c}&state=${state}`}
                    onClick={() => trackAgentCta(agent.AccountId_15__c, 'card_button')}
                  >
                    <Button buttonText="Contact Now" />
                  </Link>
                </div>
                <div className="md:pl-10 pl-4">
                  <div>
                    <Link
                      href={`/contact-agent?form=agent&fn=${agent.FirstName}&id=${agent.AccountId_15__c}&state=${state}`}
                      onClick={() => trackAgentCta(agent.AccountId_15__c, 'card_heading')}
                    >
                      <h3 className="text-[#292F6C] tahoma md:text-[34px] text-[20px] font-bold">
                        {agent?.Name}
                      </h3>
                    </Link>
                    <div className="text-[#6C757D] tahoma md:text-[18px] text-sm font-normal sm:mt-4 mt-0">
                      <p className="font-bold">
                        {orderMilitaryServiceInfo(agent?.Military_Status__pc || "", agent?.Military_Service__pc || "")}
                      </p>
                      <p>{agent?.Brokerage_Name__pc}</p>
                    </div>
                    <AgentBio bio={agent?.Agent_Bio__pc || ""} />
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
