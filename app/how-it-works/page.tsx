import HowItWorkHeroSection from "@/components/HowItWork/HowItWorkHeroSection/HowItWorkHeroSection";
import Covered from "@/components/homepage/Covered/Covered";
import HowItWorkText from "@/components/HowItWork/HowItWorkText/HowItWorkText";
import KeepInTouch from "@/components/homepage/KeepInTouch/KeepInTouch";
import Footer from "@/components/Footer/Footer";

export default function Home() {
  return (
    <>
      <HowItWorkHeroSection />
      <Covered />
      <HowItWorkText />
      <KeepInTouch />
      <Footer />
    </>
  );
}
