import MilitarySpouseHeroSection from "@/components/MilitarySpouse/MilitarySpouseHerosection/MilitarySpouseHeroSection";
import Covered from "@/components/homepage/Covered/Covered";
import SquaredAway from "@/components/MilitarySpouse/SquaredAway/SquaredAway";
import MilitarySpouseEmployment from "@/components/MilitarySpouse/MilSpouseEmployment/MilSpouseEmployment";
import MovingOurLife from "@/components/MilitarySpouse/MovingOurLife/MovingOurLife";
import PcsResourcesVaLoanGuide from "@/components/PcsResources/PcsResourcesVaLoanGuide/PcsResourcesVaLoanGuide";
import PcsResourcesTrustedResources from "@/components/PcsResources/PcsResourcesTrustedResources/PcsResourcesTrustedResources";
import ReviewsList from "@/components/homepage/ReviewsList/ReviewList";
import MilitarySpouseApproved from "@/components/MilitarySpouse/MilSpouseApproved/MilSpouseApproved";
import StateMap from "@/components/homepage/StateMap";
import VideoFamily from "@/components/homepage/VideoFamily";
import Testimonials from "@/components/Testimonials/TestimonialPage";
import WhyVeteranPcs from "@/components/homepage/WhyVeteranPCS";
import VideoReview from "@/components/Impact/VideoReview/VideoReview";
import AboutOurStory from "@/components/Impact/AboutOurStory/AboutOurStory";
import FrequentlyAskedQuestion from "@/components//stories/FrequentlyAskedQuestions/FrequentlyAskedQuestions";
import KeepInTouch from "@/components/homepage/KeepInTouch/KeepInTouch";
import Footer from "@/components/Footer/Footer";

// const MemoizedVideoFamily = memo(VideoFamily)
// const MemoizedTestimonials = memo(Testimonials)
// const MemoizedReviewsList = memo(ReviewsList)

export default function Home() {
  return (
    <>
      <MilitarySpouseHeroSection />
      <Covered />
      <SquaredAway />
      <MilitarySpouseEmployment />
      <MovingOurLife />
      <PcsResourcesVaLoanGuide />
      <PcsResourcesTrustedResources />
      <ReviewsList />
      <MilitarySpouseApproved />
      <StateMap />
      <VideoFamily />
      <Testimonials />
      <WhyVeteranPcs />
      <VideoReview />
      <AboutOurStory />

      <FrequentlyAskedQuestion />
      <KeepInTouch />
      <Footer />
    </>
  );
}
