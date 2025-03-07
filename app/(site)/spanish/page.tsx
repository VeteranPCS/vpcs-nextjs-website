import { Metadata } from "next";
import HeroSection from "@/components/homepage/HeroSection/HeroSection";
import StateMap from "@/components/homepage/StateMap";
import Mission from "@/components/spanishpage/Mission/Mission";
import Covered from "@/components/homepage/Covered/Covered";
import FamilySupport from "@/components/homepage/FamilySupport/FamilySupport";
import VeteranPCS from "@/components/homepage/VeteranPCSWorksComp/VeteranPCSWorks";
import MakeItHome from "@/components/homepage/MakeItHome";
import VeteranComunity from "@/components/homepage/VeteranCommunity/VeteranCommunity";
import AgentLoanExpert from "@/components/homepage/AgentLoanExpert/AgentLoanExpert";
import SkillFuturesBuild from "@/components/homepage/SkillsFuturesBuild/SkillsFuturesBuild";
import KeepInTouch from "@/components/homepage/KeepInTouch/KeepInTouch";
import SupportSpanish from "@/components/spanishpage/SupportSpanish/SupportSpanish";
import Testimonials from "@/components/Testimonials/TestimonialPage";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const META_TITLE = "Military Members & Veterans: Get a Top Agent, VA Loan Support & Up to $4,000, for Free";
const META_DESCRIPTION = "Tired of navigating the home buying process alone during every PCS? With VeteranPCS, get a trusted veteran or military spouse agent, expert VA loan guidance, and a Move In Bonus up to $4,000—so you save money, avoid costly mistakes, and buy or sell with confidence. No cost, no hassle, just results.";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL || ""),
  title: {
    template: "%s | VeteranPCS",
    default: META_TITLE,
  },
  alternates: {
    canonical: `${BASE_URL}/spanish`,
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
      <HeroSection
        title="Juntos, Llegaremos a Casa."
        subTitle="VeteranPCS esta empoderando a los miembros de las fuerzas armadas hispanohablantes y a sus familias al comprar o vender una vivienda."
        page="spanish"
      />
      <StateMap
        title="¿Quieres comprar o vender?"
        subTitle="VeteranPCS esta empoderando a los miembros de las fuerzas armadas hispanohablantes y a sus familias al comprar o vender una vivienda."
      />
      <Mission />
      <SupportSpanish />
      <Testimonials />
      <Covered />
      <FamilySupport />
      <VeteranPCS />
      <VeteranComunity />
      <MakeItHome />
      <AgentLoanExpert />
      <SkillFuturesBuild />
      <KeepInTouch />
    </main>
  );
}
