import ImpactHeroSection from "@/components/Impact/ImpactHeroSection/ImpactHeroSection";
import YourImpact from "@/components/Impact/YourImpact/YourImpact";
import Slider from "@/components/common/Slider";
import VideoFamily from "@/components/homepage/VideoFamily";
import ImageSlider from "@/components/common/ImageSlider";
import Covered from "@/components/homepage/Covered/Covered";
import FamilySupport from "@/components/homepage/FamilySupport/FamilySupport";
import VeteranPCS from "@/components/homepage/VeteranPCSWorksComp/VeteranPCSWorks";
import MakeItHome from "@/components/homepage/MakeItHome";
import VeteranComunity from "@/components/homepage/VeteranCommunity/VeteranCommunity";
import WhyVeteranPcs from "@/components/homepage/WhyVeteranPCS";
import FrequentlyAskedQuestion from "@/components//stories/FrequentlyAskedQuestions/FrequentlyAskedQuestions";
import KeepInTouch from "@/components/homepage/KeepInTouch/KeepInTouch";
import Footer from "@/components/Footer/Footer";

export default function Home() {
  return (
    <>
      <ImpactHeroSection />
      <YourImpact />
      <VideoFamily />
      <Covered />
      <FamilySupport />
      <VeteranPCS />
      <MakeItHome />
      <VeteranComunity />
      <WhyVeteranPcs />
      <WhyVeteranPcs />
      <FrequentlyAskedQuestion />
      <KeepInTouch />
      <Footer />
    </>
  );
}
