import SpanishHeroSection from "@/components/stories/StoriesHeroSection/StoriesHeroSection";
import SuccessStories from "@/components/stories/successstories/SuccessStories";
import OptionSection from "@/components/stories/optionssection/OptionsSection";
import VideoFamily from "@/components/homepage/VideoFamily";
import Covered from "@/components/homepage/Covered/Covered";
import FamilySupport from "@/components/homepage/FamilySupport/FamilySupport";
import WhyVeteranPcs from "@/components/homepage/WhyVeteranPCS";
import FrequentlyAskedQuestion from "@/components//stories/FrequentlyAskedQuestions/FrequentlyAskedQuestions";
import KeepInTouch from "@/components/homepage/KeepInTouch/KeepInTouch";
import Footer from "@/components/Footer/Footer";
import Testimonials from "@/components/Testimonials/TestimonialPage";
import ReviewsList from "@/components/homepage/ReviewsList/ReviewList";
import { memo } from "react";

const MemoizedVideoFamily = memo(VideoFamily)
const MemoizedTestimonials = memo(Testimonials)
const MemoizedReviewsList = memo(ReviewsList)
const MemoizedFrequentlyAskedQuestion = memo(FrequentlyAskedQuestion)
const MemoizedFamilySupport = memo(FamilySupport)

export default function Home() {
  return (
    <>
      <SpanishHeroSection />
      <SuccessStories />
      <MemoizedTestimonials />
      <MemoizedReviewsList />
      <OptionSection />
      <MemoizedVideoFamily />
      <Covered />
      {/* <FamilySupport /> */}
      <MemoizedFamilySupport />
      <WhyVeteranPcs />
      <MemoizedFrequentlyAskedQuestion />
      <KeepInTouch />
      <Footer />
    </>
  );
}
