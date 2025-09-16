import { Metadata } from "next";
import StoriesHeroSection from "@/components/stories/StoriesHeroSection/StoriesHeroSection";
import SuccessStories from "@/components/stories/successstories/SuccessStories";
import OptionSection from "@/components/stories/optionssection/OptionsSection";
import VideoFamily from "@/components/homepage/VideoFamily";
import Covered from "@/components/homepage/Covered/Covered";
import FamilySupport from "@/components/homepage/FamilySupport/FamilySupport";
import WhyVeteranPcs from "@/components/homepage/WhyVeteranPCS";
import FrequentlyAskedQuestion from "@/components//stories/FrequentlyAskedQuestions/FrequentlyAskedQuestions";
import KeepInTouch from "@/components/homepage/KeepInTouch/KeepInTouch";
import Testimonials from "@/components/Testimonials/TestimonialPage";
import ReviewsList from "@/components/homepage/ReviewsList/ReviewList";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const META_TITLE = "Military PCS Success Stories: From Orders to New Home Keys";
const META_DESCRIPTION = "Real military families share their PCS journey experiences, from short-notice orders to finding the perfect home near base. Read how fellow service members navigated VA loans, negotiated BAH-optimized purchases, and earned Move-In Bonuses while supporting fellow veterans.";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL || ""),
  title: {
    template: "%s | VeteranPCS",
    default: META_TITLE,
  },
  description: META_DESCRIPTION,
  alternates: {
    canonical: `${BASE_URL}/stories`,
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

export default function StoriesPage() {
  return (
    <>
      <StoriesHeroSection />
      <SuccessStories />
      <Testimonials />
      <ReviewsList />
      <OptionSection />
      <VideoFamily />
      <Covered />
      <FamilySupport
        link="https://www.veteranpcs.com/impact"
        component_slug="support-our-veteran-community"
      />
      <WhyVeteranPcs />
      <FrequentlyAskedQuestion />
      <KeepInTouch />
    </>
  );
}
