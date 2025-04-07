import React from "react";
import "@/app/globals.css";
import HeroSection from "@/components/common/HeroSection";
import aboutService from "@/services/aboutService";
import { AboutVetPcsResponse } from '@/components/About/HowVetPcsStarted/HowVetPcsStarted'

const AboutHeroSection = async () => {
  let pageData: AboutVetPcsResponse | null = null;

  try {
    pageData = await aboutService.fetchOverviewDetails('overview');
  } catch (error) {
    console.error('Error fetching About Overview:', error);
    return <p>Failed to load the Digital Innovation Team&apos;s Data.</p>;
  }

  return (
    <HeroSection
      backgroundImage={pageData?.background_image?.asset?.image_url || '/assets/aboutherosectionbg.webp'}
      title={pageData?.header}
      description={pageData?.description}
      buttonText={pageData?.buttonText || "default button"}
      buttonLink="/#map-container"
      logoPath={pageData?.foreground_image?.asset?.image_url || "/icon/VeteranPCS-logo_wht-outline.svg"}
      logoAlt={pageData?.foreground_image?.alt || "Description of the image"}
    />
  );
};

export default AboutHeroSection;