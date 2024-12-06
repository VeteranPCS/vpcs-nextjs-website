"use client";
import HeroSection from "@/components/homepage/HeroSection/HeroSection";
import StateMap from "@/components/homepage/StateMap";
import Mission from "@/components/spanishpage/Mission/Mission";
import ImageSlider from "@/components/common/ImageSlider";
import Covered from "@/components/homepage/Covered/Covered";
import FamilySupport from "@/components/homepage/FamilySupport/FamilySupport";
import VeteranPCS from "@/components/homepage/VeteranPCSWorksComp/VeteranPCSWorks";
import MakeItHome from "@/components/homepage/MakeItHome";
import VeteranComunity from "@/components/homepage/VeteranCommunity/VeteranCommunity";
import AgentLoanExpert from "@/components/homepage/AgentLoanExpert/AgentLoanExpert";
import SkillFuturesBuild from "@/components/homepage/SkillsFuturesBuild/SkillsFuturesBuild";
import KeepInTouch from "@/components/homepage/KeepInTouch/KeepInTouch";
import Footer from "@/components/Footer/Footer";
import SupportSpanish from "@/components/spanishpage/SupportSpanish/SupportSpanis";

import userImageServices from "@/services/userService";
import { useEffect, useState } from "react";

export default function Home() {
  const [userImageList, SetUserImageList] = useState([]);

  useEffect(() => {
    fetchUserImage();
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

  return (
    <main>
      <HeroSection
        title="Together, We’ll Make It Home."
        subTitle="If you’re looking for a Spanish speaking agent"
        page="spanish"
      />
      <StateMap />
      <Mission />
      <SupportSpanish />
      <ImageSlider userImageList={userImageList} />
      <Covered />
      <FamilySupport />
      <VeteranPCS />
      <VeteranComunity />
      <MakeItHome />
      <AgentLoanExpert />
      <SkillFuturesBuild />
      <KeepInTouch />
      <Footer />
    </main>
  );
}
