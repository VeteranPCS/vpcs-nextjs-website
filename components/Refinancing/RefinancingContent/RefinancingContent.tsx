import React from "react";
import "@/app/globals.css";
import WhatIsRefinance from "./WhatIsRefinance";
import HowDoesItWork from "./HowDoesItWork";
import WhenDoesItMakeSense from "./WhenDoesItMakeSense";
import WhenDoesItNotMakeSense from "./WhenDoesItNotMakeSense";
import FeesInvolved from "./FeesInvolved";
import BreakEvenExamples from "./BreakEvenExamples";
import BeingProactive from "./BeingProactive";
import NormalVsJunkFees from "./NormalVsJunkFees";
import RefinanceTimeline from "./RefinanceTimeline";
import TypesOfRefinances from "./TypesOfRefinances";
import HelocAndHeloan from "./HelocAndHeloan";
import VaDisability from "./VaDisability";
import CreditImpact from "./CreditImpact";
import CreditChanges from "./CreditChanges";
import Link from "next/link";

const RefinancingContent = () => {
  return (
    <div className="py-12 lg:px-0 px-5" id="how-it-works">
      <div className="container mx-auto">
        <WhatIsRefinance />
        <div className="border-b-2 mt-3 border-[#203269]"></div>
        <HowDoesItWork />
        <div className="border-b-2 mt-3 border-[#203269]"></div>
        <WhenDoesItMakeSense />
        <div className="border-b-2 mt-3 border-[#203269]"></div>
        <WhenDoesItNotMakeSense />
        <div className="border-b-2 mt-3 border-[#203269]"></div>
        <FeesInvolved />
        <div className="border-b-2 mt-3 border-[#203269]"></div>
        <BreakEvenExamples />
        <div className="border-b-2 mt-3 border-[#203269]"></div>
        <BeingProactive />
        <div className="border-b-2 mt-3 border-[#203269]"></div>
        <NormalVsJunkFees />
        <div className="border-b-2 mt-3 border-[#203269]"></div>
        <RefinanceTimeline />
        <div className="border-b-2 mt-3 border-[#203269]"></div>
        <TypesOfRefinances />
        <div className="border-b-2 mt-3 border-[#203269]"></div>
        <HelocAndHeloan />
        <div className="border-b-2 mt-3 border-[#203269]"></div>
        <VaDisability />
        <div className="border-b-2 mt-3 border-[#203269]"></div>
        <CreditImpact />
        <div className="border-b-2 mt-3 border-[#203269]"></div>
        <CreditChanges />
        
        <div className="mt-10">
          <p className="text-[#000000] roboto lg:text-[23px] md:text-[23px] sm:text-[15px] text-[15px] md:font-medium sm:font-normal font-normal">
            The information above is intended to provide a general overview of VA loan refinancing options and is not financial advice. Consult with a qualified VA loan specialist to determine the best refinancing strategy for your specific situation.
          </p>
        </div>
        <div className="my-4">
          <p className="text-[#000000] roboto lg:text-[23px] md:text-[23px] sm:text-[15px] text-[15px] md:font-medium sm:font-normal font-normal">
            Ready to explore your refinancing options?
            <Link href="/contact-lender" className="text-[#348BE2]"> Connect with a VA loan expert</Link> today to see how much you could save.
          </p>
        </div>
      </div>
    </div>
  );
};

export default RefinancingContent;
