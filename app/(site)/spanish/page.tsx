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
import Image from "next/image";
import Link from "next/link";
import Button from "@/components/common/Button";

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
        title="Tu hogar, nuestra mision."
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
      {/* Latinos in Uniform Section */}
      <div className="bg-[#F4F4F4] px-6 sm:px-0">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-center py-10 md:py-20">
            <div className="w-full md:w-1/2 flex justify-center">
              <Image
                width={400}
                height={400}
                src={"/assets/latinos_in_uniform.webp"}
                alt="Latinos in Uniform"
                className="lg:w-[400px] w-[300px] lg:h-[400px] h-auto"
              />
            </div>
            <div className="w-full md:w-1/2 mt-10 md:mt-0 max-w-[500px] flex flex-col items-center md:items-start text-center md:text-left">
              <h6 className="text-[22px] md:text-[25px] font-bold text-[#292F6C] mt-5 tahoma uppercase">
                Apoya a los miembros del servicio latino, veteranos y sus familias
              </h6>
              <p className="text-black font-roboto text-base font-medium mt-4">
                Cada agente y experto en préstamos VA en VeteranPCS es un veterano o cónyuge de militar que comprende el estrés de mudarse en el servicio o después de éste. Aunque solo algunos agentes en VeteranPCS hablan español, estamos comprometidos a identificar más agentes para ayudar a servir a la comunidad latina.
              </p>
              <div className="mt-6 w-full">
                <p className="text-[#292F6C] font-bold">Visita a nuestros socios Latinos in Uniform</p>
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 items-center sm:items-start justify-center sm:justify-start mt-4">
                  <Link href="https://latinosinuniform.com/" className="underline text-black">latinosinuniform.com</Link>
                  <Link href="https://www.instagram.com/latinosinuniform/" className="underline text-black">@latinosinuniform</Link>
                </div>
              </div>
              <div className="flex justify-center md:justify-start mt-6 w-full">
                <Link href="https://latinosinuniform.com/">
                  <Button buttonText="Latinos en uniforme" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
      <VeteranCommunity component_slug="support-our-veteran-community-spanish" />
      <CoveredSpanish />
      <AgentLoanExpertSpanish />
      <SkillFuturesBuildSpanish />
      <KeepInTouch />
    </main>
  );
}
