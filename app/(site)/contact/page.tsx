import { Metadata } from "next";
import ContactHero from "@/components/contactpage/ContactHeroSection/ContactHeroSection";
import ContactForm from "@/components/contactpage/ContactForm/ContactForm";
import ReviewsList from "@/components/homepage/ReviewsList/ReviewList";
import WhyVeteranPcs from "@/components/homepage/WhyVeteranPCS";
import SkillFuturesBuild from "@/components/homepage/SkillsFuturesBuild/SkillsFuturesBuild";
import KeepInTouch from "@/components/homepage/KeepInTouch/KeepInTouch";
import AgentLoanExpert from "@/components/homepage/AgentLoanExpert/AgentLoanExpert";
import { memo } from "react";

const MemoizedReviewsList = memo(ReviewsList);

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const META_TITLE = "Get Connected with a Veteran-Friendly Realtor or Lender";
const META_DESCRIPTION = "Have questions or need help with your military move? Contact Veteran PCS to connect with a veteran or military spouse real estate agent who understands PCS moves, VA loans, and the challenges of relocation.";

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
      <ContactHero />
      <ContactForm />
      <MemoizedReviewsList />
      <WhyVeteranPcs />
      <AgentLoanExpert />
      <SkillFuturesBuild />
      <KeepInTouch />
    </>
  );
}
