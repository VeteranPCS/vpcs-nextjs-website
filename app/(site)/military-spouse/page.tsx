import { Metadata } from "next";
import MilitarySpouseHeroSection from "@/components/MilitarySpouse/MilitarySpouseHerosection/MilitarySpouseHeroSection";
import Covered from "@/components/homepage/Covered/Covered";
import SquaredAway from "@/components/MilitarySpouse/SquaredAway/SquaredAway";
import MilitarySpouseEmployment from "@/components/MilitarySpouse/MilSpouseEmployment/MilSpouseEmployment";
import MovingOurLife from "@/components/MilitarySpouse/MovingOurLife/MovingOurLife";
import PcsResourcesVaLoanGuide from "@/components/PcsResources/PcsResourcesVaLoanGuide/PcsResourcesVaLoanGuide";
import PcsResourcesTrustedResources from "@/components/PcsResources/PcsResourcesTrustedResources/PcsResourcesTrustedResources";
import ReviewsList from "@/components/homepage/ReviewsList/ReviewList";
import MilitarySpouseApproved from "@/components/MilitarySpouse/MilSpouseApproved/MilSpouseApproved";
import StateMap from "@/components/homepage/StateMap";
import VideoFamily from "@/components/homepage/VideoFamily";
import Testimonials from "@/components/Testimonials/TestimonialPage";
import WhyVeteranPcs from "@/components/homepage/WhyVeteranPCS";
import VideoReview from "@/components/Impact/VideoReview/VideoReview";
import AboutOurStory from "@/components/Impact/AboutOurStory/AboutOurStory";
import FrequentlyAskedQuestion from "@/components//stories/FrequentlyAskedQuestions/FrequentlyAskedQuestions";
import KeepInTouch from "@/components/homepage/KeepInTouch/KeepInTouch";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const META_TITLE = "Support for Military Spouses - Employment & Moving Resources";
const META_DESCRIPTION = "Explore VeteranPCS's dedicated resources for military spouses, including remote employment opportunities with Squared Away, moving assistance from Porch and BoxOps, and access to veteran-owned businesses. Empower your journey with our community-driven support.";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL || ""),
  title: {
    template: "%s | VeteranPCS",
    default: META_TITLE,
  },
  description: META_DESCRIPTION,
  alternates: {
    canonical: `${BASE_URL}/military-spouse`,
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

export default function MilitarySpousePage() {
  return (
    <>
      <MilitarySpouseHeroSection />
      <Covered />
      <SquaredAway />
      <MilitarySpouseEmployment />
      <MovingOurLife />
      <PcsResourcesVaLoanGuide />
      <PcsResourcesTrustedResources />
      <ReviewsList />
      <MilitarySpouseApproved />
      <StateMap
        title="Buying or Selling?"
        subTitle="Choose a state below to connect with our veteran and military spouse agents and lenders"
        buttonText="Don't want to browse? Find an Agent For Me"
        buttonLink="/contact-agent"
      />
      <VideoFamily />
      <Testimonials />
      <WhyVeteranPcs />
      <VideoReview />
      <AboutOurStory />

      <FrequentlyAskedQuestion />
      <KeepInTouch />
    </>
  );
}
