import StatePageHeroSection from "@/components/StatePage/StatePaheHeroSection/StatePageHeroSection";
import StatePageHeroSecondSection from "@/components/StatePage/StatePageHeroSecondSection/StatePageHeroSecondSection";
import StatePageVaLoan from "@/components/StatePage/StatePageVaLoan/StatePageVaLoan";
import StatePageCTA from "@/components/StatePage/StatePageCTA/StatePageCTA";
import StatePageCityAgents from "@/components/StatePage/StatePageCityAgents/StatePageCityAgents";
import StatePageLetFindAgent from "@/components/StatePage/StatePageLetFindAgent/StatePageLetFindAgent";
import StatePageWhyChooseVetpcs from "@/components/StatePage/StatePageWhyChooseVetpcs/StatePageWhyChooseVetpcs";
import FrequentlyAskedQuestion from "@/components//stories/FrequentlyAskedQuestions/FrequentlyAskedQuestions";
import KeepInTouch from "@/components/homepage/KeepInTouch/KeepInTouch";
import Footer from "@/components/Footer/Footer";
import { memo } from "react";

// const MemoizedVideoFamily = memo(VideoFamily)
// const MemoizedTestimonials = memo(Testimonials)
// const MemoizedReviewsList = memo(ReviewsList)
const MemoizedFrequentlyAskedQuestion = memo(FrequentlyAskedQuestion)

export default function Home() {
  return (
    <>
      <StatePageHeroSection />
      <StatePageHeroSecondSection />
      <StatePageVaLoan />
      <StatePageCTA />
      <StatePageCityAgents />
      <StatePageLetFindAgent />
      <StatePageWhyChooseVetpcs />
      <MemoizedFrequentlyAskedQuestion />
      <KeepInTouch />
      <Footer />
    </>
  );
}
