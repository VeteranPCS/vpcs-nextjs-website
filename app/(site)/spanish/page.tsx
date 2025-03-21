import { Metadata } from "next";
import HeroSection from "@/components/homepage/HeroSection/HeroSection";
import StateMap from "@/components/homepage/StateMap";
import VeteranCommunity from "@/components/homepage/VeteranCommunity/VeteranCommunity";
import KeepInTouch from "@/components/homepage/KeepInTouch/KeepInTouch";
import SupportSpanish from "@/components/spanishpage/SupportSpanish/SupportSpanish";
import Testimonials from "@/components/Testimonials/TestimonialPage";
import MissionSpanish from "@/components/spanishpage/Mission/MissionSpanish";
import CoveredSpanish from "@/components/spanishpage/CoveredSpanish/CoveredSpanish";
import AgentLoanExpertSpanish from "@/components/spanishpage/AgentLoanExpertSpanish/AgentLoanExpertSpanish";
import SkillFuturesBuildSpanish from "@/components/spanishpage/SkillsFuturesBuild/SkillsFuturesBuildSpanish";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const META_TITLE = "Agentes Inmobiliarios para Militares - Bono de $4,000";
const META_DESCRIPTION = "¿Órdenes de PCS? Conecte con agentes hispanos con experiencia militar que entienden préstamos VA, asignaciones de vivienda militar, y requisitos de bases. Gane hasta $4,000 en bonos de mudanza mientras apoya organizaciones de veteranos—sin costo para usted."

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
        buttonText="¿No ves un agente que hable español? Haz clic aquí"
        buttonLink="/contact-agent"
      />
      <MissionSpanish />
      <SupportSpanish />
      <Testimonials />
      <VeteranCommunity component_slug="support-our-veteran-community-spanish" />
      <CoveredSpanish />
      <AgentLoanExpertSpanish />
      <SkillFuturesBuildSpanish />
      <KeepInTouch />
    </main>
  );
}
