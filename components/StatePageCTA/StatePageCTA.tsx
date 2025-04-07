import React from "react";
import "@/app/globals.css";
import CTASection from "@/components/common/CTASection";

const StatePageCTA = ({ cityName }: { cityName: string }) => {
  const buttons = [
    { text: "Agent", link: "/contact-agent" },
    { text: "Lender", link: "/contact-lender", isSecondary: true },
  ];

  return (
    <CTASection
      backgroundColor="linear-gradient(233deg, #2A2F6C 28.37%, #555CA4 95.18%), #D9D9D9"
      title={`Talk to our Agents in ${cityName} Today`}
      description={
        `Are you a veteran or military spouse in search of a ${cityName} ` +
        "realtor who understands your distinctive requirements? " +
        "VeteranPCS is the answer. We are not serving merely as another " +
        "real estate platform; we represent a community of veterans and " +
        "military spouses committed to supporting one another throughout " +
        `transitional periods. Connect with a military-friendly real ` +
        `estate agent in ${cityName} today and initiate your PCS move with ` +
        "confidence."
      }
      buttons={buttons}
      image={{
        src: "/assets/military-signing.png",
        alt: "Military signing",
        width: 530,
        height: 530,
        className: "lg:w-[530px] lg:h-[530px] md:w-[530px] md:h-[530px] sm:w-[326px] sm:h-[326px] w-[326px] h-[326px] object-cover",
      }}
      icon="/icon/userplus.svg"
    />
  );
};

export default StatePageCTA;