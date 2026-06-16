import React from "react";
import "@/app/globals.css";
import classes from "./HowItWorkHeroSection.module.css";
import Image from "next/image";
import howItWorksService from "@/services/howItWorksService";
import { HowItWorksContentProps } from '@/services/howItWorksService';
import Button from "@/components/common/Button";
import Link from "next/link";

const militaryBonusNotes = [
  "Note: You will be eligible for the military bonus or relocation grant when you contact an agent through the VeteranPCS website. If you do not use the website to sign up with your agent you may not be eligible for the military bonus.",
  "Note: the $200-$4,000 military bonus only applies when you work with a real estate agent from VeteranPCS. The lenders associated with VeteranPCS can save you additional money. The $200-$4,000 military bonus only applies if you connect with your agent through our website.",
];

const getBlockText = (block: HowItWorksContentProps["description"][number]) =>
  block.children.map((child) => child.text).join(" ").replace(/\s+/g, " ").trim();

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

  const heroBullets = overviewSection.description.map((item) => ({
    key: item._key,
    text: getBlockText(item),
  })).filter(({ text }) => text);

  return (
    <div className="relative">
      <div className={classes.HowitworkHeroSectionContainer}>
        <div className="container mx-auto">
          <div className="items-start justify-between gap-4">
            <div className="mx-auto text-left w-full sm:order-2 order-2 lg:order-none md:order-none">
              <h1 className="text-white lg:text-[52px] md:text-[52px] sm:text-[32px] text-[32px] poppins leading-[1.3] tahoma">
                {overviewSection.component_header[0].children.map((child) =>
                  child.marks.includes("strong") ? (
                    <span key={child._key} className="font-bold">
                      {child.text}
                    </span>
                  ) : (
                    child.text
                  )
                )}
              </h1>
              <div className="mb-10 mt-10">
                <div className="flex flex-col md:flex-row md:flex-wrap md:justify-between">
                  {heroBullets.map((item) => (
                    <div key={item.key} className="flex items-start gap-4 my-4 md:w-[48%]">
                      <Image
                        width={100}
                        height={100}
                        src="/icon/checkred.svg"
                        alt="check"
                        className="w-7 h-7 mt-2"
                        loading="eager"
                      />
                      <p className="text-white poppins lg:text-[24px] md:text-[20px] sm:text-[16px] text-[16px] font-medium text-sm tahoma lg:w-[450px] md:w-full sm:w-full w-full leading-8">
                        {item.text}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="mt-5 flex flex-col items-center gap-3 sm:mt-6">
                  <p className="text-center text-white poppins text-[18px] md:text-[20px] lg:text-[22px] font-semibold tahoma">
                    It&apos;s that easy!
                  </p>
                  <Link href="/how-it-works#agent-map">
                    <Button buttonText="Find an Agent" />
                  </Link>
                </div>
                <details className="mx-auto mt-5 max-w-3xl border-t border-white/20 pt-4 text-white/85">
                  <summary className="mx-auto w-fit cursor-pointer poppins text-[14px] font-semibold text-white/90 underline decoration-white/30 underline-offset-4 marker:text-white/70">
                    Military bonus eligibility details
                  </summary>
                  <div className="mt-4 space-y-3 text-left">
                    {militaryBonusNotes.map((note) => (
                      <p key={note} className="poppins text-[13px] sm:text-[14px] leading-6 tahoma">
                        {note}
                      </p>
                    ))}
                  </div>
                </details>

              </div>
              <div className="absolute bottom-[-15%] left-1/2 transform -translate-x-1/2">
                <Image
                  width={1000}
                  height={1000}
                  src="/icon/VeteranPCS-logo_wht-outline.svg"
                  alt="Description of the image"
                  className="lg:w-[250px] lg:h-[250px] md:w-[250px] md:h-[250px] sm:w-[250px] sm:h-[250px] w-[200px] h-[200px]"
                  loading="eager"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HowItWorkHeroSection;
