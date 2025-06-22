import { Metadata } from "next";
import HowItWorkHeroSection from "@/components/HowItWork/HowItWorkHeroSection/HowItWorkHeroSection";
import Covered from "@/components/homepage/Covered/Covered";
import HowItWorkText from "@/components/HowItWork/HowItWorkText/HowItWorkText";
import KeepInTouch from "@/components/homepage/KeepInTouch/KeepInTouch";
import StateMap from "@/components/homepage/StateMap";
import MovingBonusCalculator from "@/components/PcsResources/MovingBonusCalculator/MovingBonusCalculator";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const META_TITLE = "The VeteranPCS Process: PCS Support, VA Loan Expertise & $4,000 Bonuses";
const META_DESCRIPTION = "Your military move, simplified. From PCS orders to closing, we connect you with agents who understand military timelines and VA requirements. Receive personalized support, expert guidance, and up to $4,000 in Move-In Bonuses—all while supporting veteran charities.";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL || ""),
  title: {
    template: "%s | VeteranPCS",
    default: META_TITLE,
  },
  alternates: {
    canonical: `${BASE_URL}/how-it-works`,
  },
  description: META_DESCRIPTION,
  openGraph: {
    type: "website",
    locale: "en_US",
    url: BASE_URL,
    siteName: "VeteranPCS",
    images: [
      {
        url: `${BASE_URL}/opengraph/og-logo.png`,
        width: 1200,
        height: 630,
        alt: "VeteranPCS",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    description: META_DESCRIPTION,
    title: META_TITLE,
    images: ['/opengraph/og-logo.png'],
  },
};

export default function HowItWorksPage() {
  return (
    <>
      <HowItWorkHeroSection />
      <div className="mt-10">
        <MovingBonusCalculator />
      </div>
      <div id="agent-map" className="bg-[#aeb0c7] pt-24 lg:pt-32 xl:pt-40">
        <StateMap
          title="Buying or Selling?"
          subTitle="Choose a state below to connect with our veteran and military spouse agents and lenders"
          buttonText="Don't want to browse? Find an Agent For Me"
          buttonLink="/contact-agent"
        />
      </div>
      <Covered />
      <HowItWorkText />
      <KeepInTouch />
    </>
  );
}
