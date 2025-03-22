import { Metadata } from "next";
import ContactHero from "@/components/contactpage/ContactHeroSection/ContactHeroSection";
import ContactForm from "@/components/contactpage/ContactForm/ContactForm";
import ReviewsList from "@/components/homepage/ReviewsList/ReviewList";
import WhyVeteranPcs from "@/components/homepage/WhyVeteranPCS";
import SkillFuturesBuild from "@/components/homepage/SkillsFuturesBuild/SkillsFuturesBuild";
import KeepInTouch from "@/components/homepage/KeepInTouch/KeepInTouch";
import AgentLoanExpert from "@/components/homepage/AgentLoanExpert/AgentLoanExpert";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const META_TITLE = "Connect with Military-Experienced Real Estate Agents | PCS with Confidence";
const META_DESCRIPTION = "Facing a short-notice PCS or first-time VA loan? Our veteran and military spouse agents understand your unique timeline, BAH considerations, and base requirements. Free consultation with no obligation—we're here to serve you.";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL || ""),
  title: {
    template: "%s | VeteranPCS",
    default: META_TITLE,
  },
  alternates: {
    canonical: `${BASE_URL}/contact`,
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
      <ReviewsList />
      <WhyVeteranPcs />
      <AgentLoanExpert />
      <SkillFuturesBuild />
      <KeepInTouch />
    </>
  );
}
