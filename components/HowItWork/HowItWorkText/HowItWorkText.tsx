import React from "react";
import "@/styles/globals.css";
import HowVeterencePCSServiceWorks from "./HowVeterencePCSServiceWorks";
import HowTheMoveInBonusWorks from "./HowTheMoveInBonusWorks";
import WhoIsEligableForMoveIn from "./WhoIsEligableForMoveIn";
import HowItWorksForAgent from "./HowItWorksForAgent";
import HowItWorksForMortagageOfficer from "./HowItWorksForMortagageOfficer";
import WhatMakeUsDifferent from "./WhatMakeUsDifferent";
import WhatCharitiesDoYouSupport from "./WhatCharitiesDoYouSupport";
import Link from "next/link";

const HowItWorkText = () => {
  return (
    <div className="py-12 lg:px-0 px-5">
      <div className="container mx-auto">
        <HowVeterencePCSServiceWorks />
        <div className="border-b-2 mt-3 border-[#203269]"></div>
        <HowTheMoveInBonusWorks />
        <div className="border-b-2 mt-3 border-[#203269]"></div>
        <WhoIsEligableForMoveIn />
        <div className="border-b-2 mt-3 border-[#203269]"></div>
        <HowItWorksForAgent />
        <div className="border-b-2 mt-3 border-[#203269]"></div>
        <HowItWorksForMortagageOfficer />
        <div className="border-b-2 mt-3 border-[#203269]"></div>
        <WhatMakeUsDifferent />
        <div className="border-b-2 mt-3 border-[#203269]"></div>
        <WhatCharitiesDoYouSupport />
        <div className="mt-10">
          <p className="text-[#000000] roboto lg:text-[23px] md:text-[23px] sm:text-[15px] text-[15px] md:font-medium sm:font-normal font-normal">
            The above is intended to provide a general overview of how the
            VeteranPCS service works, but is qualified in its entirety by the
            <Link href="/terms-of-use" className="text-[#348BE2]"> Platform Terms of Use.</Link> If
            you use our services, you must read, understand, and agree to the{" "}
            <Link href="/terms-of-use" className="text-[#348BE2]"> Platform Terms of Use.</Link> If
            you are an agent, you must agree to our Referral Partner Agreement.
          </p>
        </div>
        <div className="my-4">
          <p className="text-[#000000] roboto lg:text-[23px] md:text-[23px] sm:text-[15px] text-[15px] md:font-medium sm:font-normal font-normal">
            Visit our
            <Link href="/contact" className="text-[#348BE2]"> contact page</Link> to find out
            how you can become a preferred agent or lender with VeteranPCS.
          </p>
        </div>
      </div>

    </div>
  );
};

export default HowItWorkText;
