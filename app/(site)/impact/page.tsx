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
import FrequentlyAskedQuestions from "@/components/stories/FrequentlyAskedQuestions/FrequentlyAskedQuestions";
import KeepInTouch from "@/components/homepage/KeepInTouch/KeepInTouch";
import VeteranPcsGivesBack from '@/components/Impact/VeteranPcsGivesBack/VeteranPcsGivesBack';

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const META_TITLE = "Our Mission Impact: Supporting Military Families & Veteran Charities";
const META_DESCRIPTION = "The VeteranPCS difference: $300,000+ in service member savings, $25,000+ donated to veteran charities, and 2,000+ successful military moves. See how your transaction helps fellow service members and strengthens the veteran community.";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL || ""),
  title: {
    template: "%s | VeteranPCS",
    default: META_TITLE,
  },
  alternates: {
    canonical: `${BASE_URL}/impact`,
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


export default function ImpactPage() {
  return (
    <>
      <ImpactHeroSection />
      <YourImpact />
      <MakeAnImpact />
      <Testimonials />
      <FamilySupport />
      <WearBlueSection />
      <VeteranPcsGivesBack />
      <ReviewsList />
      <VideoReview />
      <AboutOurStory />
      <WhyVeteranPcs />
      <AgentLoanExpert />
      <SkillFuturesBuild />
      <FrequentlyAskedQuestions />
      <KeepInTouch />
    </>
  );
}
