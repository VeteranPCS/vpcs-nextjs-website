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
import Footer from "@/components/Footer/Footer";
import SupportSpanish from "@/components/spanishpage/SupportSpanish/SupportSpanis";
import Testimonials from "@/components/Testimonials/TestimonialPage";
import { memo } from "react";

const MemoizedStateMap = memo(StateMap)
const MemoizedCovered = memo(Covered)
const MemoizedTestimonials = memo(Testimonials)
const MemoizedVeteranComunity = memo(VeteranComunity)
const MemoizedFamilySupport = memo(FamilySupport)

export default function Home() {
  return (
    <main>
      <HeroSection
        title="Together, We’ll Make It Home."
        subTitle="If you’re looking for a Spanish speaking agent"
        page="spanish"
      />
      <MemoizedStateMap />
      <Mission />
      <SupportSpanish />
      <MemoizedTestimonials />
      <MemoizedCovered />
      {/* <FamilySupport /> */}
      <MemoizedFamilySupport />
      <VeteranPCS />
      {/* <VeteranComunity /> */}
      <MemoizedVeteranComunity />
      <MakeItHome />
      <AgentLoanExpert />
      <SkillFuturesBuild />
      <KeepInTouch />
      <Footer />
    </main>
  );
}
