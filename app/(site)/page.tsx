import StateMap from "@/components/homepage/StateMap";
import HeroSection from "@/components/homepage/HeroSection/HeroSection";
import FeaturedLogos from "@/components/homepage/FeaturedLogos/FeaturedLogos";
import VideoFamily from "@/components/homepage/VideoFamily";
import Covered from "@/components/homepage/Covered/Covered";
import FamilySupport from "@/components/homepage/FamilySupport/FamilySupport";
import VeteranPCS from "@/components/homepage/VeteranPCSWorksComp/VeteranPCSWorks";
import MakeItHome from "@/components/homepage/MakeItHome";
import VeteranCommunity from "@/components/homepage/VeteranCommunity/VeteranCommunity";
import WhyVeteranPcs from "@/components/homepage/WhyVeteranPCS";
import AgentLoanExpert from "@/components/homepage/AgentLoanExpert/AgentLoanExpert";
import SkillFuturesBuild from "@/components/homepage/SkillsFuturesBuild/SkillsFuturesBuild";
import KeepInTouch from "@/components/homepage/KeepInTouch/KeepInTouch";
import ReviewsList from "@/components/homepage/ReviewsList/ReviewList";
import MovingBonusCalculator from "@/components/PcsResources/MovingBonusCalculator/MovingBonusCalculator";
import AgentFinderPopupWrapper from "@/components/AgentFinderPopup/AgentFinderPopupWrapper";


export default function Home() {
  return (
    <main>
      <HeroSection
        title="Together, We’ll Make It Home."
        subTitle="Veteran & Military Spouse Real Estate Agents and VA Loan Experts You Can Trust"
        page="home"
      />
      <StateMap
        title="Where are you moving?"
        subTitle="Choose your destination state to see military-friendly agents and VA loan experts, or let us match you directly."
        buttonText="Match Me With An Agent"
        buttonLink="/contact-agent"
      />
      <FeaturedLogos />
      <MovingBonusCalculator />
      <VeteranPCS />
      <ReviewsList />
      <VideoFamily />
      <VeteranCommunity component_slug="support-our-veteran-community" />
      <WhyVeteranPcs />
      <FamilySupport
        link="https://www.veteranpcs.com/impact"
        component_slug="support-our-veteran-community"
      />
      <MakeItHome />
      <Covered />
      <AgentLoanExpert />
      <SkillFuturesBuild />
      <KeepInTouch />
      <AgentFinderPopupWrapper />
    </main>
  );
}
