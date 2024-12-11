import ImpactHeroSection from "@/components/Impact/ImpactHeroSection/ImpactHeroSection";
import YourImpact from "@/components/Impact/YourImpact/YourImpact";
import MakeAnImpact from "@/components/Impact/MakeAnImpact/MakeAnImpact";
import Testimonials from "@/components/Testimonials/TestimonialPage";
import FamilySupport from "@/components/homepage/FamilySupport/FamilySupport";
import WearBlueSection from "@/components/Impact/WearBlueSection/WearBlueSection";
import ImpactVaLoan from "@/components/Impact/ImpactVaLoan/ImpactVaLoan";
import ReviewsList from "@/components/homepage/ReviewsList/ReviewList";
import VideoReview from "@/components/Impact/VideoReview/VideoReview";
import AboutOurStory from "@/components/Impact/AboutOurStory/AboutOurStory";
import WhyVeteranPcs from "@/components/homepage/WhyVeteranPCS";
import AgentLoanExpert from "@/components/homepage/AgentLoanExpert/AgentLoanExpert";
import SkillFuturesBuild from "@/components/homepage/SkillsFuturesBuild/SkillsFuturesBuild";
import FrequentlyAskedQuestion from "@/components//stories/FrequentlyAskedQuestions/FrequentlyAskedQuestions";
import KeepInTouch from "@/components/homepage/KeepInTouch/KeepInTouch";
import Footer from "@/components/Footer/Footer";
import { memo } from "react";

// const MemoizedImpactHeroSection = memo(ImpactHeroSection)
// const MemoizedYourImpact = memo(YourImpact)
// const MemoizedMakeAnImpact = memo(MakeAnImpact)
const MemoizedTestimonials = memo(Testimonials)
const MemoizedFamilySupport = memo(FamilySupport)
// const MemoizedWearBlueSection = memo(WearBlueSection)
const MemoizedImpactVaLoan = memo(ImpactVaLoan)
const MemoizedReviewsList = memo(ReviewsList)
const MemoizedVideoReview = memo(VideoReview)
// const MemoizedAboutOurStory = memo(AboutOurStory)
// const MemoizedWhyVeteranPcs = memo(WhyVeteranPcs)
// const MemoizedAgentLoanExpert = memo(AgentLoanExpert)
// const MemoizedSkillFuturesBuild = memo(SkillFuturesBuild)
const MemoizedFrequentlyAskedQuestion = memo(FrequentlyAskedQuestion)
// const MemoizedKeepInTouch = memo(KeepInTouch)
// const MemoizedFooter = memo(Footer)

export default function Home() {
  return (
    <>
      <ImpactHeroSection />
      {/* <MemoizedImpactHeroSection /> */}
      <YourImpact />
      {/* <MemoizedYourImpact /> */}
      <MakeAnImpact />
      {/* <MemoizedMakeAnImpact /> */}

      <MemoizedTestimonials />

      {/* <FamilySupport /> */}
      <MemoizedFamilySupport />
      <WearBlueSection />
      {/* <MemoizedWearBlueSection /> */}
      <ImpactVaLoan />
      {/* <MemoizedImpactVaLoan /> */}

      <MemoizedReviewsList />
      <MemoizedVideoReview />

      <AboutOurStory />
      {/* <MemoizedAboutOurStory /> */}
      <WhyVeteranPcs />
      {/* <MemoizedWhyVeteranPcs /> */}
      <AgentLoanExpert />
      {/* <MemoizedAgentLoanExpert /> */}
      <SkillFuturesBuild />
      {/* <MemoizedSkillFuturesBuild /> */}
      {/* <FrequentlyAskedQuestion /> */}
      <MemoizedFrequentlyAskedQuestion />
      <KeepInTouch />
      {/* <MemoizedKeepInTouch /> */}
      <Footer />
      {/* <MemoizedFooter /> */}
    </>
  );
}
