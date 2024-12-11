import PcsResources from "@/components/PcsResources/PcsResources/PcsResources";
import Covered from "@/components/homepage/Covered/Covered";
import VideoFamily from "@/components/homepage/VideoFamily";
import Testimonials from "@/components/Testimonials/TestimonialPage";
import PcsResourcesBlog from "@/components/PcsResources/PcsResourcesBlog/PcsResourcesBlog";
import FamilySupport from "@/components/homepage/FamilySupport/FamilySupport";
import PcsResourcesVaLoanGuide from "@/components/PcsResources/PcsResourcesVaLoanGuide/PcsResourcesVaLoanGuide";
import FrequentlyAskedQuestion from "@/components//stories/FrequentlyAskedQuestions/FrequentlyAskedQuestions";
import PcsResourcesCalculators from "@/components/PcsResources/PcsResourcesCalculators/PcsResourcesCalculators";
import PcsResourcesEmployment from "@/components/PcsResources/PcsResourcesEmployment/PcsResourcesEmployment";
import ReviewsList from "@/components/homepage/ReviewsList/ReviewList";
import PcsResourcesMilSpouse from "@/components/PcsResources/PcsResourcesMilSpouse/PcsResourcesMilSpouse";
import PcsResourcesMovingYourLife from "@/components/PcsResources/PcsResourcesMovingYourLife/PcsResourcesMovingYourLife";
import PcsResourcesTrustedResources from "@/components/PcsResources/PcsResourcesTrustedResources/PcsResourcesTrustedResources";
import PcsResourcesHowDoesWork from "@/components/PcsResources/PcsResourcesHowDoesWork/PcsResourcesHowDoesWorkIt";
import PcsResourcesMovingPcsing from "@/components/PcsResources/PcsResourcesMovingPcsing/PcsResourcesMovingPcsing";
import VideoReview from "@/components/Impact/VideoReview/VideoReview";
import AboutOurStory from "@/components/Impact/AboutOurStory/AboutOurStory";
import KeepInTouch from "@/components/homepage/KeepInTouch/KeepInTouch";
import Footer from "@/components/Footer/Footer";
import { memo } from "react";

const MemoizedCovered = memo(Covered)
const MemoizedVideoFamily = memo(VideoFamily)
const MemoizedTestimonials = memo(Testimonials)
const MemoizedReviewsList = memo(ReviewsList)
const MemoizedVideoReview = memo(VideoReview)
const MemoizedFrequentlyAskedQuestion = memo(FrequentlyAskedQuestion)
const MemoizedFamilySupport = memo(FamilySupport)

export default function Home() {
  return (
    <main>
      <PcsResources />
      <MemoizedCovered />
      <MemoizedVideoFamily />
      <MemoizedTestimonials />
      <PcsResourcesBlog />
      {/* <FamilySupport /> */}
      <MemoizedFamilySupport />
      <PcsResourcesVaLoanGuide />
      <MemoizedFrequentlyAskedQuestion />
      <PcsResourcesCalculators />
      <PcsResourcesEmployment />
      <MemoizedReviewsList />
      <PcsResourcesMilSpouse />
      <PcsResourcesMovingYourLife />
      <PcsResourcesTrustedResources />
      <PcsResourcesHowDoesWork />
      <PcsResourcesMovingPcsing />
      <div className="bg-[#EEEEEE] py-12">
        <MemoizedVideoReview />
        <AboutOurStory />
      </div>
      <FrequentlyAskedQuestion />
      <KeepInTouch />
      <Footer />
    </main>
  );
}
