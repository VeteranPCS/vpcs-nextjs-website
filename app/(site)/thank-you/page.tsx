import Thankyou from "@/components/Thank-You/ThankYouHeroSection";
import PcsResourcesHowDoesWork from "@/components/PcsResources/PcsResourcesHowDoesWork/PcsResourcesHowDoesWorkIt";
import VideoReview from "@/components/Impact/VideoReview/VideoReview";
import AboutOurStory from "@/components/Impact/AboutOurStory/AboutOurStory";
import Covered from "@/components/homepage/Covered/Covered";
import KeepInTouch from "@/components/homepage/KeepInTouch/KeepInTouch";
import Testimonials from "@/components/Testimonials/TestimonialPage";
import CommonBlog from "@/components/BlogPage/BlogPage/BlogCTA/CommonBlog";
import { memo } from "react";

const MemoizedVideoReview = memo(VideoReview)
const MemoizedTestimonials = memo(Testimonials)

export default function Home() {
  return (
    <main>
      <Thankyou />
      <PcsResourcesHowDoesWork />
      <Covered />
      <MemoizedTestimonials />
      <MemoizedVideoReview />
      <AboutOurStory />
      <div className="mb-16">
        <CommonBlog component="Let’s talk VA loan" />
      </div>
      <KeepInTouch />
    </main>
  );
}
