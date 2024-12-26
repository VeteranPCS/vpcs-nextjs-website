import Thankyou from "@/components/Thank-You/ThankYouHeroSection";
import PcsResourcesHowDoesWork from "@/components/PcsResources/PcsResourcesHowDoesWork/PcsResourcesHowDoesWorkIt";
import VideoReview from "@/components/Impact/VideoReview/VideoReview";
import AboutOurStory from "@/components/Impact/AboutOurStory/AboutOurStory";
import PcsResourcesBlog from "@/components/PcsResources/PcsResourcesBlog/PcsResourcesBlog";
import Covered from "@/components/homepage/Covered/Covered";
import KeepInTouch from "@/components/homepage/KeepInTouch/KeepInTouch";
import Footer from "@/components/Footer/Footer";
import Testimonials from "@/components/Testimonials/TestimonialPage";
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
        <PcsResourcesBlog title="Let’s talk VA loan" description="Our experts breakdown buying with a VA loan" link="connect with a VA Loan expert!" url="#"/>
      </div>
      <KeepInTouch />
      <Footer />
    </main>
  );
}
