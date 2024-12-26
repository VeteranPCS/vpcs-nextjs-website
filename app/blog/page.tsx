import BlogPageHeroSection from "@/components/BlogPage/BlogPage/BlogPageHeroSection/BlogPageHeroSection";
import BlogMovingPcsingBlogPostSection from "@/components/BlogPage/BlogPage/BlogMovingPcsingBlogPostSection/BlogMovingPcsingBlogPostSection";
import BlogCta from "@/components/BlogPage/BlogPage/BlogCTA/BlogCta";
import PcsResourcesBlog from "@/components/PcsResources/PcsResourcesBlog/PcsResourcesBlog";
import KeepInTouch from "@/components/homepage/KeepInTouch/KeepInTouch";
import Footer from "@/components/Footer/Footer";
import { memo } from "react";

const MemoizedKeepInTouch = memo(KeepInTouch);

export default async function Home() {
  return (
    <>
      <BlogPageHeroSection />
      <BlogMovingPcsingBlogPostSection />
      <BlogCta />
      <PcsResourcesBlog title="Let’s talk VA loan" description="Our experts breakdown buying with a VA loan" link="connect with a VA Loan expert!" url="#"/>
      <div className="my-5">
        <PcsResourcesBlog title="Military Bases" description="Our experts breakdown buying with a VA loan" link="connect with a VA Loan expert!" url="#"/>
      </div>
      <MemoizedKeepInTouch />
      <Footer />
    </>
  );
}
