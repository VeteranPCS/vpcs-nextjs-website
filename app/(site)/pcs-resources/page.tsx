import { Metadata } from "next";
import PcsResources from "@/components/PcsResources/PcsResources/PcsResources";
import Covered from "@/components/homepage/Covered/Covered";
import VideoFamily from "@/components/homepage/VideoFamily";
import Testimonials from "@/components/Testimonials/TestimonialPage";
import FamilySupport from "@/components/homepage/FamilySupport/FamilySupport";
import FrequentlyAskedQuestion from "@/components//stories/FrequentlyAskedQuestions/FrequentlyAskedQuestions";
import PcsResourcesCalculators from "@/components/PcsResources/PcsResourcesCalculators/PcsResourcesCalculators";
import PcsResourcesEmployment from "@/components/PcsResources/PcsResourcesEmployment/PcsResourcesEmployment";
import ReviewsList from "@/components/homepage/ReviewsList/ReviewList";
import PcsResourcesMilSpouse from "@/components/PcsResources/PcsResourcesMilSpouse/PcsResourcesMilSpouse";
import PcsResourcesMovingYourLife from "@/components/PcsResources/PcsResourcesMovingYourLife/PcsResourcesMovingYourLife";
import PcsResourcesTrustedResources from "@/components/PcsResources/PcsResourcesTrustedResources/PcsResourcesTrustedResources";
import PcsResourcesHowDoesWork from "@/components/PcsResources/PcsResourcesHowDoesWork/PcsResourcesHowDoesWorkIt";
import MovingBonusCalculator from "@/components/PcsResources/MovingBonusCalculator/MovingBonusCalculator";
import VideoReview from "@/components/Impact/VideoReview/VideoReview";
import AboutOurStory from "@/components/Impact/AboutOurStory/AboutOurStory";
import KeepInTouch from "@/components/homepage/KeepInTouch/KeepInTouch";
import CommonBlog from "@/components/BlogPage/BlogPage/BlogCTA/CommonBlog";
import DownloadGuideComponent from "@/components/common/DownloadGuideComponent";
import StateMap from "@/components/homepage/StateMap";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const META_TITLE = "Military PCS Toolkit: Moving Guides, BAH Calculators & VA Loan Resources";
const META_DESCRIPTION = "Complete PCS preparation headquarters: download customizable PCS checklists, calculate BAH for your next duty station, access VA loan eligibility guides, and connect with military-friendly businesses near your new base—all designed by veterans who've navigated multiple PCS moves.";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL || ""),
  title: {
    template: "%s | VeteranPCS",
    default: META_TITLE,
  },
  description: META_DESCRIPTION,
  alternates: {
    canonical: `${BASE_URL}/pcs-resources`,
  },
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

export default function PcsResourcesPage() {
  return (
    <main>
      <PcsResources />
      <Covered />
      <VideoFamily />
      <Testimonials />
      <DownloadGuideComponent
        icon="/icon/home-icon.webp"
        iconAlt="First Time Home Buyer Guide"
        headerText="First Time Home Buyer Guide"
        contentText="First time buying a home? It can seem overwhelming. Check out our free first time home buyer guide to understand the process."
        downloadButtonText="Download Now"
        secondaryButtonText="Connect me with an Agent!"
        secondaryButtonLink="/contact-agent"
        downloadFileName="first-time-home-buyer-guide.pdf"
        downloadDisplayName="First-Time-Home-Buyer-Guide.pdf"
        gtmEventContent="First Time Home Buyer Guide"
        className="my-8"
      />
      <DownloadGuideComponent
        icon="/icon/home-dollar.webp"
        iconAlt="VA Loan Guide"
        headerText="VA Loan Guide"
        contentText="Don’t overpay using your VA loan, make the VA Loan work for you! Download our free VA Loan guide to learn more about the VA loan and how it can work for you."
        downloadButtonText="Download Now"
        secondaryButtonText="VA Loan Questions?"
        secondaryButtonLink="/contact-lender"
        downloadFileName="VA-Loan-Guide.pdf"
        downloadDisplayName="VA-Loan-Guide.pdf"
        gtmEventContent="VA Loan Guide"
        className="my-8"
      />
      <PcsResourcesCalculators />
      <CommonBlog component="PCS Help" />
      <PcsResourcesHowDoesWork />
      <MovingBonusCalculator />
      <FamilySupport />
      <FrequentlyAskedQuestion />
      <PcsResourcesEmployment />
      <ReviewsList />
      <VideoReview />
      <PcsResourcesMilSpouse />
      <PcsResourcesMovingYourLife />
      <PcsResourcesTrustedResources />
      <StateMap
        title="Buying or Selling?"
        subTitle="Choose a state below to connect with our veteran and military spouse agents and lenders"
        buttonText="Don't want to browse? Connect me with an Agent!"
        buttonLink="/contact-agent"
      />
      <div className="bg-[#EEEEEE]">
        <AboutOurStory />
      </div>
      <FrequentlyAskedQuestion />
      <KeepInTouch />
    </main>
  );
}
