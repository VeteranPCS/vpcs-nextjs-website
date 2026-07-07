import React from "react";
import Button from "@/components/common/Button";
import classes from "./AboutHeroSection.module.css";
import Image from "next/image";
import aboutService from "@/services/aboutService";
import { AboutVetPcsResponse } from '@/components/About/HowVetPcsStarted/HowVetPcsStarted'
import TrackedCtaLink from "@/components/common/TrackedCtaLink";

const AboutHeroSection = async () => {
  let pageData: AboutVetPcsResponse | null = null;

  try {
    pageData = await aboutService.fetchOverviewDetails('overview');
  } catch (error) {
    console.error('Error fetching About Overview:', error);
    return <p>Failed to load the Digital Innovation Team&apos;s Data.</p>;
  }

  return (
    <div>
      <div className="relative">
        <div className={classes.AboutHeroSectionContainer} style={{
          backgroundImage: `url(${pageData?.background_image?.asset?.image_url || '/assets/aboutherosectionbg.webp'})`
        }}>
          <div className="container mx-auto px-5">
            <div className="grid lg:grid-cols-2 grid-cols-1 items-start justify-between gap-6 mb-6">
              <div className="mx-auto text-left w-full order-2 md:order-none">
                <h1 className="text-white font-bold lg:text-[59px] md:text-[29px] text-[40px] poppins leading-[1.3] tahoma">
                  {pageData?.header}
                </h1>
                <p className="md:text-[18px] text-[16px] font-normal text-white poppins sm:mb-10 mb-5 mt-4 tahoma leading-[26px]">
                  {pageData?.description}
                </p>
                <p className="md:text-[18px] text-[16px] font-normal text-white poppins sm:mb-10 mb-5 mt-4 tahoma leading-[26px]">
                  This is military families, helping military families move.
                </p>
                <div>
                  <TrackedCtaLink
                    href="/#state-map"
                    cta={{
                      ctaId: 'about_hero_state_map',
                      ctaIntent: 'state_map',
                      ctaPosition: 'about_hero',
                      ctaComponent: 'about_hero',
                      ctaLabel: pageData?.buttonText || 'Find an Agent',
                      destination: '/#state-map',
                      pageType: 'about',
                    }}
                  >
                    <Button buttonText={pageData?.buttonText || "default button"} />
                  </TrackedCtaLink>
                </div>
                <div className="absolute bottom-[-15%] xl:left-[41%] md:left-[35%] left-[26%]">
                  <Image
                    width={1000}
                    height={1000}
                    src={pageData?.foreground_image?.asset?.image_url || "/icon/VeteranPCS-logo_wht-outline.svg"}
                    alt={pageData?.foreground_image?.alt || ""}
                    className="sm:w-[250px] w-[200px] h-auto"
                    loading="eager"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutHeroSection;
