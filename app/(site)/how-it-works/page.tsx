import { Metadata } from "next";
import HowItWorkHeroSection from "@/components/HowItWork/HowItWorkHeroSection/HowItWorkHeroSection";
import Covered from "@/components/homepage/Covered/Covered";
import HowItWorksDetails from "@/components/HowItWork/HowItWorksDetails/HowItWorksDetails";
import HowItWorksJsonLd from "@/components/HowItWork/HowItWorksDetails/HowItWorksJsonLd";
import KeepInTouch from "@/components/homepage/KeepInTouch/KeepInTouch";
import StateMap from "@/components/homepage/StateMap";
import MovingBonusCalculator from "@/components/PcsResources/MovingBonusCalculator/MovingBonusCalculator";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const META_TITLE = "How VeteranPCS Works: Free, Vetted Military Agents & Bonus";
const META_DESCRIPTION = "VeteranPCS is free to use. Connect with vetted military real estate agents and VA loan experts for your PCS move, and earn a bonus up to $4,000 at closing.";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL || "https://veteranpcs.com"),
  title: {
    template: "%s | VeteranPCS",
    default: META_TITLE,
  },
  alternates: {
    canonical: "/how-it-works",
  },
  description: META_DESCRIPTION,
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/how-it-works",
    siteName: "VeteranPCS",
    images: [
      {
        url: "/opengraph/og-logo.png",
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
    <main>
      <HowItWorksJsonLd />
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
      <HowItWorksDetails />
      <KeepInTouch />
    </main>
  );
}
