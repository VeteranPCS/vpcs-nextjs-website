import ContactHero from "@/components/contactpage/ContactHeroSection/ContactHeroSection";
import ContactForm from "@/components/contactpage/ContactForm/ContactForm";
import ReviewTestimonial from "@/components/homepage/ReviewTestimonial/ReviewTestimonial";
import WhyVeteranPcs from "@/components/homepage/WhyVeteranPCS";
import SkillFuturesBuild from "@/components/homepage/SkillsFuturesBuild/SkillsFuturesBuild";
import KeepInTouch from "@/components/homepage/KeepInTouch/KeepInTouch";
import Footer from "@/components/Footer/Footer";
import AgentLoanExpert from "@/components/homepage/AgentLoanExpert/AgentLoanExpert";

export default function Home() {
  return (
    <>
      <ContactHero />
      <ContactForm />
      <ReviewTestimonial />
      <WhyVeteranPcs />
      <AgentLoanExpert />
      <SkillFuturesBuild />
      <KeepInTouch />
      <Footer />
    </>
  );
}
