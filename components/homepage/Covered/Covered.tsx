"use client";
import React from "react";
import "@/app/globals.css";
import CardGrid from "@/components/common/CardGrid";

const Covered = () => {
  const cards = [
    {
      img: "/icon/Mission.svg",
      imgHover: "/icon/Missionred.svg",
      title: "Our mission",
      description: "Why is the VeteranPCS mission important?",
      link: "about",
    },
    {
      img: "/icon/Impact.svg",
      imgHover: "/icon/Impactred.svg",
      title: "Impact",
      description: "VeteranPCS impact on our military community.",
      link: "impact",
    },
    {
      img: "/icon/Loan.svg",
      imgHover: "/icon/Loanred.svg",
      title: "VA Loan",
      description: "Learn more about how the VA Loan can work for you.",
      link: "blog/va-loan-eligibility-requirements-how-to-know-if-you-qualify-for-the-va-loan",
    },
    {
      img: "/icon/Works.svg",
      imgHover: "/icon/Worksred.svg",
      title: "How It Works",
      description: "How does VeteranPCS work?",
      link: "how-it-works",
    },
    {
      img: "/icon/Stories.svg",
      imgHover: "/icon/Storiesred.svg",
      title: "Stories",
      description: "We have helped 100s of veterans and their families!",
      link: "stories",
    },
    {
      img: "/icon/Resources.svg",
      imgHover: "/icon/Resourcesred.svg",
      title: "Resources",
      description: "Check out our VeteranPCS trusted resources.",
      link: "pcs-resources",
    },
  ];

  return (
    <CardGrid
      cards={cards}
      title="We've got you covered"
      subtitle="Military community helping our military community move."
    />
  );
};

export default Covered;