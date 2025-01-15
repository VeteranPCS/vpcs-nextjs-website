import { Metadata } from "next";
import ImpactHeroSection from "@/components/Impact/ImpactHeroSection/ImpactHeroSection";
import YourImpact from "@/components/Impact/YourImpact/YourImpact";
import MakeAnImpact from "@/components/Impact/MakeAnImpact/MakeAnImpact";
import Testimonials from "@/components/Testimonials/TestimonialPage";
import FamilySupport from "@/components/homepage/FamilySupport/FamilySupport";
import WearBlueSection from "@/components/Impact/WearBlueSection/WearBlueSection";
import ImpactVaLoan from "@/components/Impact/ImpactVaLoan/ImpactVaLoan";
import ReviewsList from "@/components/homepage/ReviewsList/ReviewList";
import VideoReview from "@/components/Impact/VideoReview/VideoReview";
import AboutOurStory from "@/components/Impact/AboutOurStory/AboutOurStory";
import WhyVeteranPcs from "@/components/homepage/WhyVeteranPCS";
import AgentLoanExpert from "@/components/homepage/AgentLoanExpert/AgentLoanExpert";
import SkillFuturesBuild from "@/components/homepage/SkillsFuturesBuild/SkillsFuturesBuild";
import FrequentlyAskedQuestion from "@/components//stories/FrequentlyAskedQuestions/FrequentlyAskedQuestions";
import KeepInTouch from "@/components/homepage/KeepInTouch/KeepInTouch";
import Footer from "@/components/Footer/Footer";
import { memo } from "react";

const MemoizedTestimonials = memo(Testimonials)
const MemoizedFamilySupport = memo(FamilySupport)
const MemoizedReviewsList = memo(ReviewsList)
const MemoizedVideoReview = memo(VideoReview)

const MemoizedFrequentlyAskedQuestion = memo(FrequentlyAskedQuestion)

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const META_TITLE = "Supporting Military Families Through Real Estate";
const META_DESCRIPTION = "Discover how VeteranPCS has given back over $300,000 in hero savings, facilitated $2+ million in real estate transactions, and donated $25,000+ to veteran-focused charities. Join us in empowering military families and veterans nationwide.";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL || ""),
  title: {
    template: "%s | VeteranPCS",
    default: META_TITLE,
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


export default function Home() {
  return (
    <>
      <ImpactHeroSection />
      <YourImpact />
      <MakeAnImpact />
      <MemoizedTestimonials />
      <MemoizedFamilySupport />
      <WearBlueSection />
      <ImpactVaLoan />
      <MemoizedReviewsList />
      <MemoizedVideoReview />
      <AboutOurStory />
      <WhyVeteranPcs />
      <AgentLoanExpert />
      <SkillFuturesBuild />
      <MemoizedFrequentlyAskedQuestion />
      <KeepInTouch />
      <Footer />
    </>
  );
}
