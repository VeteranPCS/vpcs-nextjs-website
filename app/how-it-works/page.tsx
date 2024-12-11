import HowItWorkHeroSection from "@/components/HowItWork/HowItWorkHeroSection/HowItWorkHeroSection";
import Covered from "@/components/homepage/Covered/Covered";
import HowItWorkText from "@/components/HowItWork/HowItWorkText/HowItWorkText";
import KeepInTouch from "@/components/homepage/KeepInTouch/KeepInTouch";
import Footer from "@/components/Footer/Footer";

// const MemoizedVideoFamily = memo(VideoFamily)
// const MemoizedTestimonials = memo(Testimonials)
// const MemoizedReviewsList = memo(ReviewsList)

export default function Home() {
  return (
    <>
      <HowItWorkHeroSection />
      <Covered />
      <HowItWorkText />
      <KeepInTouch />
      <Footer />
    </>
  );
}
