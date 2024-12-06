"use client";
import ImpactHeroSection from "@/components/Impact/ImpactHeroSection/ImpactHeroSection";
import YourImpact from "@/components/Impact/YourImpact/YourImpact";
import MakeAnImpact from "@/components/Impact/MakeAnImpact/MakeAnImpact";
import ImpactImageslider from "@/components/common/ImageSlider";
import FamilySupport from "@/components/homepage/FamilySupport/FamilySupport";
import WearBlueSection from "@/components/Impact/WearBlueSection/WearBlueSection";
import ImpactVaLoan from "@/components/Impact/ImpactVaLoan/ImpactVaLoan";
import ReviewTestimonial from "@/components/homepage/ReviewTestimonial/ReviewTestimonial";
import VideoReview from "@/components/Impact/VideoReview/VideoReview";
import AboutOurStory from "@/components/Impact/AboutOurStory/AboutOurStory";
import WhyVeteranPcs from "@/components/homepage/WhyVeteranPCS";
import AgentLoanExpert from "@/components/homepage/AgentLoanExpert/AgentLoanExpert";
import SkillFuturesBuild from "@/components/homepage/SkillsFuturesBuild/SkillsFuturesBuild";
import FrequentlyAskedQuestion from "@/components//stories/FrequentlyAskedQuestions/FrequentlyAskedQuestions";
import KeepInTouch from "@/components/homepage/KeepInTouch/KeepInTouch";
import Footer from "@/components/Footer/Footer";

import userImageServices from "@/services/userService";
import reviewService from "@/services/reviewService";
import { useEffect, useState } from "react";

export default function Home() {
  const [userImageList, SetUserImageList] = useState([]);
  const [reviewsList, SetReviewsList] = useState([]);

  useEffect(() => {
    fetchUserImage();
    fetchReviews();
  }, []);

  const fetchUserImage = async () => {
    try {
      const response = await userImageServices.fetchImages();
      if (!response.ok) throw new Error("Failed to fetch posts");
      const data = await response.json();
      SetUserImageList(data);
    } catch (error) {
      console.error("Error fetching posts:", error);
    }
  };
  const fetchReviews = async () => {
    try {
      const response = await reviewService.fetchReviews();
      if (!response.ok) throw new Error("Failed to fetch posts");
      const data = await response.json();
      SetReviewsList(data);
    } catch (error) {
      console.error("Error fetching posts:", error);
    }
  };

  return (
    <>
      <ImpactHeroSection />
      <YourImpact />
      <MakeAnImpact />
      <ImpactImageslider userImageList={userImageList} />
      <FamilySupport />
      <WearBlueSection />
      <ImpactVaLoan />
      <ReviewTestimonial reviewsList={reviewsList} />
      <VideoReview />
      <AboutOurStory />
      <WhyVeteranPcs />
      <AgentLoanExpert />
      <SkillFuturesBuild />
      <FrequentlyAskedQuestion />
      <KeepInTouch />
      <Footer />
    </>
  );
}
