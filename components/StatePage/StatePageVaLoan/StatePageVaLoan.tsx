"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Button from "@/components/common/Button";
import Link from "next/link";
import { LendersData, Lenders } from "@/services/stateService";
import orderMilitaryServiceInfo from "@/utils/getMilitaryServiceInfo";
import { trackCtaClicked } from "@/lib/analytics/client";
import { buildContactCtaHref } from "@/lib/contactAgentUrl";

const LenderBio = ({ bio }: { bio: string }) => {
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

const StatePageVaLoan = ({ cityName, lendersData, state }: { cityName: string, lendersData: LendersData | [], state: string }) => {
  const lenderContactHref = (lender: Lenders) => buildContactCtaHref({
    firstName: lender.FirstName,
    salesforceId: lender.AccountId_15__c,
    stateSlug: state,
    form: 'lender',
  });

  const trackLenderCta = (lenderId: string, position: string) => {
    trackCtaClicked({
      cta_id: 'state_lender_card_contact',
      cta_intent: 'contact_lender',
      cta_position: position,
      cta_component: 'state_lender_card',
      destination_path: '/contact-lender',
      state_slug: state,
      partner_type: 'lender',
      partner_salesforce_id: lenderId,
    });
  };

  return (
    <div>
      <div className="container mx-auto md:py-12 py-5 md:px-0 px-5">
        <div className="text-center">
          <h2 className="text-[#292F6C] text-center tahoma md:text-[44px] text-[31px] font-bold md:w-[600px] w-full mx-auto">
            {cityName} VA Loan Experts
          </h2>
          <div className="bg-[#7E1618] rounded-full py-1 w-20 mx-auto my-5"></div>
          <p className="text-[#515151] text-center tahoma md:text-[18px] text-[14px] font-normal xl:max-w-[1300px] px-5 xl:px-0 w-full mx-auto">
            VA loan intricacies can be overwhelming. At VeteranPCS, we
            facilitate your connection with specialized VA loan experts, who
            will not only guide you expertly but also ensure that all potential
            benefits are maximized and costly errors are avoided.
          </p>
        </div>
        <div className="grid lg:grid-cols-2 grid-cols-1 items-start justify-between gap-10 mt-10">
          {Array.isArray(lendersData) || !lendersData.records
            ? <p>No lenders available</p>
            : lendersData.records.map((lender: Lenders) => {
              const contactHref = lenderContactHref(lender);

              return (
                <div key={lender.AccountId_15__c} className="rounded-[30px] border bg-white shadow-[0px_5px_14px_0px_rgba(8,_15,_52,_0.04)] flex sm:p-8 p-4">
                  <div className="justify-center items-center flex flex-col">
                    <div className="rounded-full bg-[#E1EDFB] sm:w-[200px] sm:h-[200px] w-[100px] h-[100px] flex justify-center items-center overflow-hidden mb-4 sm:mb-0">
                      <Link
                        href={contactHref}
                        onClick={() => trackLenderCta(lender.AccountId_15__c, 'card_image')}
                      >
                        <Image
                          src={lender?.PhotoUrl || ""}
                          alt={`${lender?.Name}'s Profile Picture`}
                          width={1000}
                          height={1000}
                          sizes="(min-width: 640px) 200px, 100px"
                          className="object-cover"
                        />
                      </Link>
                    </div>
                    <Link
                      href={contactHref}
                      onClick={() => trackLenderCta(lender.AccountId_15__c, 'card_button')}
                    >
                      <Button buttonText="Contact Now" />
                    </Link>
                  </div>
                  <div className="md:pl-10 pl-4">
                    <div>
                      <Link
                        href={contactHref}
                        onClick={() => trackLenderCta(lender.AccountId_15__c, 'card_heading')}
                      >
                        <h3 className="text-[#292F6C] tahoma md:text-[34px] text-[24px] font-bold">
                          {lender?.Name}
                        </h3>
                      </Link>
                      <div className="text-[#6C757D] tahoma md:text-[18px] text-sm font-normal sm:mt-4 mt-0">
                        <p className="font-bold">
                          {orderMilitaryServiceInfo(lender?.Military_Status__pc || "", lender?.Military_Service__pc || "")}
                        </p>
                        <p>NMLS: {lender.Individual_NMLS_ID__pc}</p>
                        {lender.Company_NMLS_ID__pc &&
                          <>
                            <p>{lender.Brokerage_Name__pc}</p>
                            <p>NMLS: {lender.Company_NMLS_ID__pc}</p>
                          </>
                        }
                      </div>
                      <LenderBio bio={lender?.Agent_Bio__pc || ""} />

                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
};

export default StatePageVaLoan;
