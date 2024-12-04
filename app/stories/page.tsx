import SpanishHeroSection from "@/components/stories/StoriesHeroSection/StoriesHeroSection";
import SuccessStories from "@/components/stories/successstories/SuccessStories";
import ImageSlider from "@/components/common/ImageSlider";
import ReviewTestimonial from "@/components/homepage/ReviewTestimonial/ReviewTestimonial";
import OptionSection from "@/components/stories/optionssection/OptionsSection";
import VideoFamily from "@/components/homepage/VideoFamily";
import Covered from "@/components/homepage/Covered/Covered";
import FamilySupport from "@/components/homepage/FamilySupport/FamilySupport";
import WhyVeteranPcs from "@/components/homepage/WhyVeteranPCS";
import FrequentlyAskedQuestion from "@/components//stories/FrequentlyAskedQuestions/FrequentlyAskedQuestions";
import KeepInTouch from "@/components/homepage/KeepInTouch/KeepInTouch";
import Footer from "@/components/Footer/Footer";

export default function Home() {
  return (
    <>
      <SpanishHeroSection />
      <SuccessStories />
      <ImageSlider />
      <ReviewTestimonial />
      <OptionSection />
      <VideoFamily />
      <Covered />
      <FamilySupport />
      <WhyVeteranPcs />
      <FrequentlyAskedQuestion />
      <KeepInTouch />
      <Footer />
    </>
  );
}
