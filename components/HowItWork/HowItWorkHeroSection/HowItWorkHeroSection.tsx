import React from "react";
import "@/app/globals.css";
import HeroSection from "@/components/common/HeroSection";
import howItWorksService from "@/services/howItWorksService";
import { HowItWorksContentProps } from '@/services/howItWorksService';
import Image from "next/image";

async function HowItWorkHeroSection() {
  let overviewSection: HowItWorksContentProps | null = null;

  try {
    overviewSection = await howItWorksService.fetchOverviewSection("how-veteranpcs-works");
  } catch (error) {
    console.error("Error fetching blogs", error);
  }

  if (!overviewSection) {
    return <p>Failed to load the How It Works Overview Section.</p>;
  }

  const title = (
    <>
      {overviewSection.component_header[0].children.map((child) =>
        child.marks.includes("strong") ? (
          <span key={child._key} className="font-bold">
            {child.text}
          </span>
        ) : (
          child.text
        )
      )}
    </>
  );

  const descriptionContent = (
    <div className="flex flex-col md:flex-row md:flex-wrap md:justify-between">
      {overviewSection.description.map((item, index) => (
        <div key={index} className="flex items-start gap-4 my-4 md:w-[48%]">
          <Image
            width={100}
            height={100}
            src="/icon/checkred.svg"
            alt="check"
            className="w-7 h-7 mt-2"
            loading="eager"
          />
          <p className="text-white poppins lg:text-[24px] md:text-[20px] sm:text-[16px] text-[16px] font-medium text-sm tahoma lg:w-[450px] md:w-full sm:w-full w-full leading-8">
            {item.children.map((child) => child.text).join(" ")}
          </p>
        </div>
      ))}
    </div>
  );

  return (
    <HeroSection
      backgroundImage="/assets/Howitworkhero.webp"
      title={title}
      description={descriptionContent}
      buttonText="Find an Agent"
      buttonLink="/how-it-works#agent-map"
      logoPath="/icon/VeteranPCS-logo_wht-outline.svg"
      logoAlt="Description of the image"
      containerClassName="mt-[100px]"
      titleClassName="lg:text-[52px] md:text-[52px] sm:text-[32px] text-[32px]"
    />
  );
};

export default HowItWorkHeroSection;