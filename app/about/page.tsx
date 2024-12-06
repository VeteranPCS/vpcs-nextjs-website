"use client";
import AboutHeroSection from "@/components/About/aboutherosection/AboutHeroSection";
import Mission from "@/components/spanishpage/Mission/Mission";
import SupportSpanish from "@/components/spanishpage/SupportSpanish/SupportSpanis";
import HowVetPcsStarted from "@/components/About/HowVetPcsStarted/HowVetPcsStarted";
import CeoFounder from "@/components/About/CeoFounder/CeoFounder";
import DigitalTeam from "@/components/About/DigitalTeam/DigitalTeam";
import AdminTeam from "@/components/About/AdminTeam/AdminTeam";
import FrequentlyAskedQuestion from "@/components//stories/FrequentlyAskedQuestions/FrequentlyAskedQuestions";
import KeepInTouch from "@/components/homepage/KeepInTouch/KeepInTouch";
import Footer from "@/components/Footer/Footer";

export default function Home() {
  return (
    <main>
      <AboutHeroSection />
      <Mission />
      <SupportSpanish />
      <HowVetPcsStarted />
      <CeoFounder />
      <DigitalTeam />
      <AdminTeam />
      <FrequentlyAskedQuestion />
      <KeepInTouch />
      <Footer />
    </main>
  );
}
