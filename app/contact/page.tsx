import ContactHero from "@/components/contactpage/ContactHeroSection/ContactHeroSection";
import ContactForm from "@/components/contactpage/ContactForm/ContactForm";
import ReviewsList from "@/components/homepage/ReviewsList/ReviewList";
import WhyVeteranPcs from "@/components/homepage/WhyVeteranPCS";
import SkillFuturesBuild from "@/components/homepage/SkillsFuturesBuild/SkillsFuturesBuild";
import KeepInTouch from "@/components/homepage/KeepInTouch/KeepInTouch";
import Footer from "@/components/Footer/Footer";
import AgentLoanExpert from "@/components/homepage/AgentLoanExpert/AgentLoanExpert";
import { memo } from "react";

const MemoizedReviewsList = memo(ReviewsList);

export default function Home() {
  return (
    <>
      <ContactHero />
      <ContactForm />
      <MemoizedReviewsList />
      <WhyVeteranPcs />
      <AgentLoanExpert />
      <SkillFuturesBuild />
      <KeepInTouch />
      <Footer />
    </>
  );
}
