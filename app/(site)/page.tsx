import StateMap from "@/components/homepage/StateMap";
import HeroSection from "@/components/homepage/HeroSection/HeroSection";
import FeaturedLogos from "@/components/homepage/FeaturedLogos/FeaturedLogos";
import Testimonials from "@/components/Testimonials/TestimonialPage";
import VideoFamily from "@/components/homepage/VideoFamily";
import Covered from "@/components/homepage/Covered/Covered";
import FamilySupport from "@/components/homepage/FamilySupport/FamilySupport";
import VeteranPCS from "@/components/homepage/VeteranPCSWorksComp/VeteranPCSWorks";
import MakeItHome from "@/components/homepage/MakeItHome";
import VeteranComunity from "@/components/homepage/VeteranCommunity/VeteranCommunity";
import WhyVeteranPcs from "@/components/homepage/WhyVeteranPCS";
import AgentLoanExpert from "@/components/homepage/AgentLoanExpert/AgentLoanExpert";
import SkillFuturesBuild from "@/components/homepage/SkillsFuturesBuild/SkillsFuturesBuild";
import KeepInTouch from "@/components/homepage/KeepInTouch/KeepInTouch";
import ReviewsList from "@/components/homepage/ReviewsList/ReviewList";

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
      />
      <FeaturedLogos />
      <VideoFamily />
      <Testimonials />
      <Covered />
      <FamilySupport />
      <VeteranPCS />
      <ReviewsList />
      <MakeItHome />
      <VeteranComunity />
      <WhyVeteranPcs />
      <AgentLoanExpert />
      <SkillFuturesBuild />
      <KeepInTouch />
    </main>
  );
}
