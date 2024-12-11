import StateMap from "@/components/homepage/StateMap";
import HeroSection from "@/components/homepage/HeroSection/HeroSection";
import Agent from "@/components/homepage/AgentPages/Agent";
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
import Footer from "@/components/Footer/Footer";
import ReviewsList from "@/components/homepage/ReviewsList/ReviewList";
import { memo } from "react";

const MemoizedStateMap = memo(StateMap);
// const MemoizedHeroSection = memo(HeroSection);
const MemoizedAgent = memo(Agent);
const MemoizedTestimonials = memo(Testimonials);
const MemoizedVideoFamily = memo(VideoFamily);
const MemoizedCovered = memo(Covered);
const MemoizedFamilySupport = memo(FamilySupport);
// const MemoizedVeteranPCS = memo(VeteranPCS);
// const MemoizedMakeItHome = memo(MakeItHome);
const MemoizedVeteranComunity = memo(VeteranComunity);
// const MemoizedWhyVeteranPcs = memo(WhyVeteranPcs);
// const MemoizedAgentLoanExpert = memo(AgentLoanExpert);
// const MemoizedSkillFuturesBuild = memo(SkillFuturesBuild);
// const MemoizedKeepInTouch = memo(KeepInTouch);
// const MemoizedFooter = memo(Footer);
const MemoizedReviewsList = memo(ReviewsList);

export default function Home() {
  return (
    <main>
      <HeroSection
        title="Together, We’ll Make It Home."
        subTitle="Veteran & Military Spouse Real Estate Agents and VA Loan Experts
                You Can Trust"
        page="home"
      />
      <MemoizedStateMap />
      <MemoizedAgent />
      <MemoizedVideoFamily />
      <MemoizedTestimonials />
      <MemoizedCovered />
      {/* <FamilySupport /> */}
      <MemoizedFamilySupport />
      <VeteranPCS />
      {/* <MemoizedVeteranPCS /> */}
      <MemoizedReviewsList />
      <MakeItHome />
      {/* <MemoizedMakeItHome /> */}
      {/* <VeteranComunity /> */}
      <MemoizedVeteranComunity />
      <WhyVeteranPcs />
      {/* <MemoizedWhyVeteranPcs /> */}
      <AgentLoanExpert />
      {/* <MemoizedAgentLoanExpert /> */}
      <SkillFuturesBuild />
      {/* <MemoizedSkillFuturesBuild /> */}
      <KeepInTouch />
      {/* <MemoizedKeepInTouch /> */}
      <Footer />
      {/* <MemoizedFooter /> */}
    </main>
  );
}
