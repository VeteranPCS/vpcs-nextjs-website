import AboutHeroSection from "@/components/About/aboutherosection/AboutHeroSection";
import Mission from "@/components/spanishpage/Mission/Mission";
import SupportSpanish from "@/components/spanishpage/SupportSpanish/SupportSpanis";
import HowVetPcsStarted from "@/components/About/HowVetPcsStarted/HowVetPcsStarted";
import CeoFounder from "@/components/About/CeoFounder/CeoFounder";
import DigitalTeam from "@/components/About/DigitalTeam/DigitalTeam";
import AdminTeam from "@/components/About/AdminTeam/AdminTeam";
import FrequentlyAskedQuestion from "@/components//stories/FrequentlyAskedQuestions/FrequentlyAskedQuestions";
import KeepInTouch from "@/components/homepage/KeepInTouch/KeepInTouch";
import { memo } from "react";
import type { Metadata } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

const MemoizedHeroSection = memo(AboutHeroSection)
const MemoizedMission = memo(Mission)
const MemoizedHowVetPcsStarted = memo(HowVetPcsStarted)
const MemoizedCeoFounder = memo(CeoFounder)
const MemoizedDigitalTeam = memo(DigitalTeam)
const MemoizedAdminTeam = memo(AdminTeam)
const MemoizedFrequentlyAskedQuestion = memo(FrequentlyAskedQuestion)


const META_TITLE = "Earn Up to $4,000 Move In Bonus & Support Veteran Charities";
const META_DESCRIPTION = "Learn about VeteranPCS, a platform built by veterans for veterans. We connect military members with real estate agents who understand PCS moves, VA loans, and the unique challenges of military relocations. Enjoy top-tier service, a Move In Bonus up to $4,000, and the satisfaction of giving back—every closing supports a veteran-focused charity.";

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

export default function Home() {
  return (
    <main>
      <MemoizedHeroSection />
      <MemoizedMission />
      <SupportSpanish />
      <MemoizedHowVetPcsStarted />
      <MemoizedCeoFounder />
      <MemoizedDigitalTeam />
      <MemoizedAdminTeam />
      <MemoizedFrequentlyAskedQuestion />
      <KeepInTouch />
    </main>
  );
}