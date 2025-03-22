import AboutHeroSection from "@/components/About/aboutherosection/AboutHeroSection";
import Mission from "@/components/spanishpage/Mission/Mission";
import SupportOurVeterans from "@/components/About/Support/SupportOurVeterans";
import HowVetPcsStarted from "@/components/About/HowVetPcsStarted/HowVetPcsStarted";
import CeoFounder from "@/components/About/CeoFounder/CeoFounder";
import DigitalTeam from "@/components/About/DigitalTeam/DigitalTeam";
import AdminTeam from "@/components/About/AdminTeam/AdminTeam";
import FrequentlyAskedQuestion from "@/components/stories/FrequentlyAskedQuestions/FrequentlyAskedQuestions";
import KeepInTouch from "@/components/homepage/KeepInTouch/KeepInTouch";
import type { Metadata } from "next";
const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;


const META_TITLE = "Veteran-Founded Real Estate Network - Up to $4,000 Move-In Bonus";
const META_DESCRIPTION = "Founded by military veterans who experienced the PCS struggle firsthand. Our nationwide network of veteran and military spouse agents understand your BAH, timeline constraints, and VA loan requirements. Earn up to $4,000 in Move-In Bonuses while supporting veteran charities with every transaction.";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL || ""),
  title: {
    template: "%s | VeteranPCS",
    default: META_TITLE,
  },
  alternates: {
    canonical: `${BASE_URL}/about`,
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

export default function AboutPage() {
  return (
    <main>
      <AboutHeroSection />
      <Mission />
      <SupportOurVeterans />
      <HowVetPcsStarted />
      <CeoFounder />
      <DigitalTeam />
      <AdminTeam />
      <FrequentlyAskedQuestion />
      <KeepInTouch />
    </main>
  );
}