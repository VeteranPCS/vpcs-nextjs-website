import ContactHero from "@/components/contactpage/ContactHeroSection/ContactHeroSection";
import ContactForm from "@/components/contactpage/ContactForm/ContactForm";
import ReviewsList from "@/components/homepage/ReviewsList/ReviewList";
import WhyVeteranPcs from "@/components/homepage/WhyVeteranPCS";
import SkillFuturesBuild from "@/components/homepage/SkillsFuturesBuild/SkillsFuturesBuild";
import KeepInTouch from "@/components/homepage/KeepInTouch/KeepInTouch";
import Footer from "@/components/Footer/Footer";
import AgentLoanExpert from "@/components/homepage/AgentLoanExpert/AgentLoanExpert";
import { memo } from "react";

// const MemoizedContactHero = memo(ContactHero);
// const MemoizedContactForm = memo(ContactForm);
// const MemoizedWhyVeteranPcs = memo(WhyVeteranPcs);
// const MemoizedSkillFuturesBuild = memo(SkillFuturesBuild);
const MemoizedKeepInTouch = memo(KeepInTouch);
const MemoizedFooter = memo(Footer);
// const MemoizedAgentLoanExpert = memo(AgentLoanExpert);
const MemoizedReviewsList = memo(ReviewsList);

export default function Home() {
  return (
    <>
      <ContactHero />
      {/* <MemoizedContactHero /> */}
      <ContactForm />
      {/* <MemoizedContactForm /> */}
      
      <MemoizedReviewsList />

      <WhyVeteranPcs />
      {/* <MemoizedWhyVeteranPcs /> */}
      <AgentLoanExpert />
      {/* <MemoizedAgentLoanExpert /> */}
      <SkillFuturesBuild />
      {/* <MemoizedSkillFuturesBuild /> */}
      <KeepInTouch />
      {/* <MemoizedKeepInTouch />
      <MemoizedFooter /> */}
      <Footer />
    </>
  );
}
