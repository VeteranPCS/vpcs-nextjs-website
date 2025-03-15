"use client";
import React, { useEffect } from "react";
import "@/app/globals.css";
import AOS from "aos";
import "aos/dist/aos.css";
import CoveredComp from "./CoveredComp";
import Link from "next/link";

const cardsData = [
  {
    img: "/icon/Mission.svg",
    imgred: "/icon/Missionred.svg",
    title: "Our mission",
    subTitle: "Why is the VeteranPCS mission important?",
    link: "about",
  },
  {
    img: "/icon/Impact.svg",
    imgred: "/icon/Impactred.svg",
    title: "Impact",
    subTitle: "VeteranPCS impact on our military community.",
    link: "impact",
  },
  {
    img: "/icon/Loan.svg",
    imgred: "/icon/Loanred.svg",
    title: "VA Loan",
    subTitle: "Learn more about how the VA Loan can work for you.",
    link: "blog/va-loan-eligibility-requirements-how-to-know-if-you-qualify-for-the-va-loan",
  },
  {
    img: "/icon/Works.svg",
    imgred: "/icon/Worksred.svg",
    title: "How It Works",
    subTitle: "How does VeteranPCS work?",
    link: "how-it-works",
  },
  {
    img: "/icon/Stories.svg",
    imgred: "/icon/Storiesred.svg",
    title: "Stories",
    subTitle: "We have helped 100s of veterans and their families!",
    link: "stories",
  },
  {
    img: "/icon/Resources.svg",
    imgred: "/icon/Resourcesred.svg",
    title: "Resources",
    subTitle: "Check out our VeteranPCS trusted resources.",
    link: "pcs-resources",
  },
];

const Covered = () => {
  useEffect(() => {
    AOS.init({
      once: true,      // Make animation run once
    });
  }, []);

  return (
    <div className="container mx-auto w-full lg:py-16 md:py-16 sm:py-16 py-0 md:pt-32 sm:pb-5 pb-5">
      <div
        className="px-4 bg-[#ffffff] mx-auto text-center"
        data-aos="fade-right"
        data-aos-duration="1000"
      >
        <div className="md:block sm:hidden hidden">
          <h2 className="text-[#292F6C] font-bold lg:text-[48px] md:text-[29px] sm:text-[25px] text-[20px] tahoma  md:block ">
            We’ve got you covered
          </h2>
          <p className="normal text-[#7E1618] lg:text-[18px] md:text-[19px] sm:text-[16px] text-[16px] leading-[32px] font-medium  md:block tahoma">
            Military community helping our military community move.
          </p>
        </div>
      </div>
      <div
        className="grid xl:grid-cols-3 lg:grid-cols-2 md:grid-cols-2 sm:grid-cols-1 grid-cols-1 lg:mt-20 md:mt-10 sm:mt-10 mt-5 justify-center xl:gap-10 lg:gap-10 md:gap-10 sm:gap-2 gap-2 xl:px-10 lg:px-10 md:px-10 sm:px-3 px-3"
        data-aos="fade-left"
        data-aos-duration="1000"
      >
        {cardsData.map((card, index) => (
          // <Link href={card.link} key={index}>
          <CoveredComp
            key={index}
            card={card} // Only pass 'card' object here
          />
          // </Link>
        ))}
      </div>
    </div>
  );
};

export default Covered;
