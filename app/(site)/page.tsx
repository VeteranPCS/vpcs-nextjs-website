import StateMap from "@/components/homepage/StateMap";
import HeroSection from "@/components/homepage/HeroSection/HeroSection";
import FeaturedLogos from "@/components/homepage/FeaturedLogos/FeaturedLogos";
import Testimonials from "@/components/Testimonials/TestimonialPage";
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
        title="Buying or Selling?"
        subTitle="Choose a state below to connect with our veteran and military spouse agents and lenders"
        buttonText="Don't want to browse? Find an Agent For Me"
        buttonLink="/contact-agent"
      />
      <FeaturedLogos />
      <VideoFamily />
      <Testimonials />
      <MovingBonusCalculator />
      <Covered />
      <FamilySupport
        link="https://www.veteranpcs.com/impact"
        component_slug="support-our-veteran-community"
      />
      <VeteranPCS />
      <ReviewsList />
      <MakeItHome />
      <VeteranCommunity component_slug="support-our-veteran-community" />
      <WhyVeteranPcs />
      <AgentLoanExpert />
      <SkillFuturesBuild />
      <KeepInTouch />
      <AgentFinderPopupWrapper />
    </main>
  );
}
