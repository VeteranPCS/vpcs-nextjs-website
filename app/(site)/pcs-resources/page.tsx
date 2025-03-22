import { Metadata } from "next";
import PcsResources from "@/components/PcsResources/PcsResources/PcsResources";
import Covered from "@/components/homepage/Covered/Covered";
import VideoFamily from "@/components/homepage/VideoFamily";
import Testimonials from "@/components/Testimonials/TestimonialPage";
import FamilySupport from "@/components/homepage/FamilySupport/FamilySupport";
import PcsResourcesVaLoanGuide from "@/components/PcsResources/PcsResourcesVaLoanGuide/PcsResourcesVaLoanGuide";
import FrequentlyAskedQuestion from "@/components//stories/FrequentlyAskedQuestions/FrequentlyAskedQuestions";
import PcsResourcesCalculators from "@/components/PcsResources/PcsResourcesCalculators/PcsResourcesCalculators";
import PcsResourcesEmployment from "@/components/PcsResources/PcsResourcesEmployment/PcsResourcesEmployment";
import ReviewsList from "@/components/homepage/ReviewsList/ReviewList";
import PcsResourcesMilSpouse from "@/components/PcsResources/PcsResourcesMilSpouse/PcsResourcesMilSpouse";
import PcsResourcesMovingYourLife from "@/components/PcsResources/PcsResourcesMovingYourLife/PcsResourcesMovingYourLife";
import PcsResourcesTrustedResources from "@/components/PcsResources/PcsResourcesTrustedResources/PcsResourcesTrustedResources";
import PcsResourcesHowDoesWork from "@/components/PcsResources/PcsResourcesHowDoesWork/PcsResourcesHowDoesWorkIt";
import PcsResourcesMovingPcsing from "@/components/PcsResources/PcsResourcesMovingPcsing/PcsResourcesMovingPcsing";
import VideoReview from "@/components/Impact/VideoReview/VideoReview";
import AboutOurStory from "@/components/Impact/AboutOurStory/AboutOurStory";
import KeepInTouch from "@/components/homepage/KeepInTouch/KeepInTouch";
import CommonBlog from "@/components/BlogPage/BlogPage/BlogCTA/CommonBlog";

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
      <CommonBlog component="Let’s talk VA loan" />
      <FamilySupport />
      <PcsResourcesVaLoanGuide />
      <FrequentlyAskedQuestion />
      <PcsResourcesCalculators />
      <PcsResourcesEmployment />
      <ReviewsList />
      <PcsResourcesMilSpouse />
      <PcsResourcesMovingYourLife />
      <PcsResourcesTrustedResources />
      <PcsResourcesHowDoesWork />
      <PcsResourcesMovingPcsing />
      <div className="bg-[#EEEEEE]">
        <VideoReview />
        <AboutOurStory />
      </div>
      <FrequentlyAskedQuestion />
      <KeepInTouch />
    </main>
  );
}
