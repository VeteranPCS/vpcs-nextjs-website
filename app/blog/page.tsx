import BlogPageHeroSection from "@/components/BlogPage/BlogPage/BlogPageHeroSection/BlogPageHeroSection";
import BlogMovingPcsingBlogPostSection from "@/components/BlogPage/BlogPage/BlogMovingPcsingBlogPostSection/BlogMovingPcsingBlogPostSection";
import BlogCts from "@/components/BlogPage/BlogPage/BlogCTA/BlogCta";
import PcsResourcesBlog from "@/components/PcsResources/PcsResourcesBlog/PcsResourcesBlog";
import KeepInTouch from "@/components/homepage/KeepInTouch/KeepInTouch";
import Footer from "@/components/Footer/Footer";
import { memo } from "react";

// const MemoizedVideoFamily = memo(VideoFamily)
// const MemoizedTestimonials = memo(Testimonials)
// const MemoizedReviewsList = memo(ReviewsList)
// const MemoizedFrequentlyAskedQuestion = memo(FrequentlyAskedQuestion)

export default function Home() {
  return (
    <>
      <BlogPageHeroSection />
      <BlogMovingPcsingBlogPostSection />
      <BlogCts />
      <PcsResourcesBlog />
      <div className="my-5">
        <PcsResourcesBlog />
      </div>
      <KeepInTouch />
      <Footer />
    </>
  );
}
