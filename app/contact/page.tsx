"use client";

import ContactHero from "@/components/contactpage/ContactHeroSection/ContactHeroSection";
import ContactForm from "@/components/contactpage/ContactForm/ContactForm";
import ReviewTestimonial from "@/components/homepage/ReviewTestimonial/ReviewTestimonial";
import WhyVeteranPcs from "@/components/homepage/WhyVeteranPCS";
import SkillFuturesBuild from "@/components/homepage/SkillsFuturesBuild/SkillsFuturesBuild";
import KeepInTouch from "@/components/homepage/KeepInTouch/KeepInTouch";
import Footer from "@/components/Footer/Footer";
import AgentLoanExpert from "@/components/homepage/AgentLoanExpert/AgentLoanExpert";
import { useEffect, useState } from "react";
import reviewService from "@/services/reviewService";

export default function Home() {
  const [reviewsList, SetReviewsList] = useState([]);

  useEffect(() => {
    fetchReviews();
  }, []);

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
      <ContactHero />
      <ContactForm />
      <ReviewTestimonial reviewsList={reviewsList} />
      <WhyVeteranPcs />
      <AgentLoanExpert />
      <SkillFuturesBuild />
      <KeepInTouch />
      <Footer />
    </>
  );
}
