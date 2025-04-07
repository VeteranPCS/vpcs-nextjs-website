import React from "react";
import "@/app/globals.css";
import HeroSection from "@/components/common/HeroSection";

const HeroSec = () => {
  const features = [
    { text: "Free To Use", icon: "/icon/checkred.svg" },
    { text: "Free To Use", icon: "/icon/checkred.svg" },
  ];

  return (
    <HeroSection
      backgroundImage="/assets/impactherosection.webp"
      title={
        <>
          Community <br />
          Impact
        </>
      }
      description="By supporting VeteranPCS you are supporting veteran communities"
      features={features}
      logoPath="/icon/VeteranPCS-logo_wht-outline.svg"
      logoAlt="Description of the image"
      rightImage={{
        src: "/assets/impact_wearblue.png",
        alt: "impact_wearblue",
        width: 583,
        height: 444,
        className: "w-[583px] h-[444px] sm:block hidden",
      }}
      containerClassName="bg-[#aeb0c7] pt-[180px] z-10 relative w-full"
    />
  );
};

export default HeroSec;