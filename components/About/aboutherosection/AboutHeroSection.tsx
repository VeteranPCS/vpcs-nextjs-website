import React from "react";
import "@/app/globals.css";
import Button from "@/components/common/Button";
import classes from "./AboutHeroSection.module.css";
import Image from "next/image";
import aboutService from "@/services/aboutService";
import { AboutVetPcsResponse } from '@/components/About/HowVetPcsStarted/HowVetPcsStarted'
import Link from "next/link";

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
            <div className="grid lg:grid-cols-2 md:grid-cols-1 sm:grid-cols-1 grid-cols-1 items-start justify-between gap-6 mb-6">
              <div className="mx-auto lg:text-left md:text-left text-left w-full sm:order-2 order-2 lg:order-none md:order-none">
                <h1 className="text-white font-bold lg:text-[59px] md:text-[29px] sm:text-[40px] text-[40px] poppins leading-[1.3] tahoma">
                  {pageData?.header}
                </h1>
                <p className="lg:text-[18px] md:text-[18px] sm:text-[16px] text-[16px] font-normal text-white poppins sm:mb-10 mb-5 mt-4 tahoma leading-[26px]">
                  {pageData?.description}
                </p>
                <p className="lg:text-[18px] md:text-[18px] sm:text-[16px] text-[16px] font-normal text-white poppins sm:mb-10 mb-5 mt-4 tahoma leading-[26px]">
                  This is military families, helping military families move.
                </p>
                <div>
                  <Link href="/#state-map">
                    <Button buttonText={pageData?.buttonText || "default button"} />
                  </Link>
                </div>
                <div className="absolute bottom-[-15%] xl:left-[41%]  lg:left-[35%] md:left-[35%] sm:left-[26%] left-[26%] translate-[-45%] ">
                  <Image
                    width={1000}
                    height={1000}
                    src={pageData?.foreground_image?.asset?.image_url || "/icon/VeteranPCS-logo_wht-outline.svg"}
                    alt={pageData?.foreground_image?.alt || "Description of the image"}
                    className="lg:w-[250px] lg:h-[250px] md:w-[250px] md:h-[250px] sm:w-[250px] sm:h-[250px] w-[200px] h-[200px]"
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