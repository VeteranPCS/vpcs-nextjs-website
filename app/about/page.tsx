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
import { memo } from "react";

const MemoizedHeroSection = memo(AboutHeroSection)
const MemoizedMission = memo(Mission)
const MemoizedHowVetPcsStarted = memo(HowVetPcsStarted)
const MemoizedCeoFounder = memo(CeoFounder)
const MemoizedDigitalTeam = memo(DigitalTeam)
const MemoizedAdminTeam = memo(AdminTeam)
const MemoizedFrequentlyAskedQuestion = memo(FrequentlyAskedQuestion)

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
        <Footer />
    </main>
  );
}