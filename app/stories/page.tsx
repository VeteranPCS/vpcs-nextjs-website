"use client";
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
import { useEffect, useState } from "react";
import reviewService from "@/services/reviewService";
import userImageServices from "@/services/userService";

export default function Home() {
  const [reviewsList, SetReviewsList] = useState([]);
  const [userImageList, SetUserImageList] = useState([]);

  useEffect(() => {
    fetchReviews();
    fetchUserImage()
  })

  const fetchUserImage = async () => {
    try {
      const response = await userImageServices.fetchImages()
      if (!response.ok) throw new Error('Failed to fetch posts')
      const data = await response.json()
      SetUserImageList(data)
    } catch (error) {
      console.error('Error fetching posts:', error)
    }
  }

  const fetchReviews = async () => {
    try {
      const response = await reviewService.fetchReviews()
      if (!response.ok) throw new Error('Failed to fetch posts')
      const data = await response.json()
      SetReviewsList(data)
    } catch (error) {
      console.error('Error fetching posts:', error)
    }
  }

  return (
    <>
      <SpanishHeroSection />
      <SuccessStories />
      <ImageSlider userImageList={userImageList} />
      <ReviewTestimonial reviewsList={reviewsList} />
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
