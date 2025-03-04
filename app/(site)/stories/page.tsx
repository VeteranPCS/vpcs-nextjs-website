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
const META_TITLE = "Success Stories - Real Experiences from Military Families";
const META_DESCRIPTION = "Explore real testimonials from military families who have benefited from VeteranPCS. Learn how we've facilitated seamless PCS moves, provided Move-In Bonuses up to $1,200, and supported veteran-focused charities with each transaction.";

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
      <FamilySupport />
      <WhyVeteranPcs />
      <FrequentlyAskedQuestion />
      <KeepInTouch />
    </>
  );
}
