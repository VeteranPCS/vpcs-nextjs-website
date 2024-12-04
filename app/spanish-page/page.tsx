import HeroSection from "@/components/homepage/HeroSection/HeroSection";
import StateMap from "@/components/homepage/StateMap";
import Mission from "@/components/spanishpage/Mission/Mission";
import ImageSlider from "@/components/common/ImageSlider";
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

export default function Home() {
  return (
    <main>
      <HeroSection
        title="Together, We’ll Make It Home."
        subTitle="If you’re looking for a Spanish speaking agent"
        page="spanish"
      />
      <StateMap />
      <Mission />
      <SupportSpanish />
      <ImageSlider />
      <Covered />
      <FamilySupport />
      <VeteranPCS />
      <VeteranComunity />
      <MakeItHome />
      <AgentLoanExpert />
      <SkillFuturesBuild />
      <KeepInTouch />
      <Footer />
    </main>
  );
}
