'use client'
import StateMap from "@/components/homepage/StateMap";
import HeroSection from "@/components/homepage/HeroSection/HeroSection";
import Slider from "@/components/common/Slider";
import VideoFamily from "@/components/homepage/VideoFamily";
import ImageSlider from "@/components/common/ImageSlider";
import Covered from "@/components/homepage/Covered/Covered";
import FamilySupport from "@/components/homepage/FamilySupport/FamilySupport";
import VeteranPCS from "@/components/homepage/VeteranPCSWorksComp/VeteranPCSWorks";
import MakeItHome from "@/components/homepage/MakeItHome";
import VeteranComunity from "@/components/homepage/VeteranCommunity/VeteranCommunity";
import WhyVeteranPcs from "@/components/homepage/WhyVeteranPCS";
import AgentLoanExpert from "@/components/homepage/AgentLoanExpert/AgentLoanExpert";
import SkillFuturesBuild from "@/components/homepage/SkillsFuturesBuild/SkillsFuturesBuild";
import KeepInTouch from "@/components/homepage/KeepInTouch/KeepInTouch";
import Footer from "@/components/Footer/Footer";
import ReviewTestimonial from "@/components/homepage/ReviewTestimonial/ReviewTestimonial";
import { useEffect, useState } from "react";
import AgentServices from "@/services/agentService";
import userImageServices from "@/services/userService";
import reviewService from "@/services/reviewService";

export default function Home() {
  // const [posts, setPosts] = useState([])
  const [agentList, setAgentList] = useState([]);
  const [userImageList, SetUserImageList] = useState([]);
  const [reviewsList, SetReviewsList] = useState([]);

  useEffect(() => {
    fetchUserImage()
    fetchAgents()
    fetchReviews()
  }, [])

  useEffect(() => {
    console.log("Agent List", agentList)
    // fetchPosts()
  }, [agentList])

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

  const fetchAgents = async () => {
    try {
      const response = await AgentServices.fetchAgentsList()
      if (!response.ok) throw new Error('Failed to fetch Agents')
      const data = await response.json()
      setAgentList(data)
    } catch (error) {
      console.error('Error fetching posts:', error)
    }
  }

  return (
    <main>
      <HeroSection
        title="Together We’ll Make It Home."
        subTitle="Veteran & Military Spouse Real Estate Agents and VA Loan Experts
                You Can Trust"
        page="home"
      />
      <StateMap />
      <Slider agentList={agentList}/>
      <VideoFamily />
      <ImageSlider userImageList={userImageList} />
      <Covered />
      <FamilySupport />
      <VeteranPCS />
      <ReviewTestimonial reviewsList={reviewsList}/>
      <MakeItHome />
      <VeteranComunity />
      <WhyVeteranPcs />
      <AgentLoanExpert />
      <SkillFuturesBuild />
      <KeepInTouch />
      <Footer />
    </main>
  );
}
