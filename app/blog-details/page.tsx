import BlogDetailsHeroSection from "@/components/BlogDetails/BlogDetailsHeroSection/BlogDetailsHeroSection";
import BlogBeginingPostAgent from "@/components/BlogDetails/BlogBeginingBlogPostAgent/BlogBeginingBlogPostAgent";
import Testimonials from "@/components/Testimonials/TestimonialPage";
import BlogDetailsCta from "@/components/BlogDetails/BlogDetailsCta/BlogDetailsCta";
import EndBlogPostDetails from "@/components/BlogDetails/EndBlogPostDetails/EndBlogPostDetails";
import PcsResourcesBlog from "@/components/PcsResources/PcsResourcesBlog/PcsResourcesBlog";
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
      <BlogDetailsHeroSection />
      <BlogBeginingPostAgent />
      <Testimonials />
      <BlogDetailsCta />
      <EndBlogPostDetails />
      <PcsResourcesBlog />
      <FrequentlyAskedQuestion />
      <KeepInTouch />
      <Footer />
    </>
  );
}
