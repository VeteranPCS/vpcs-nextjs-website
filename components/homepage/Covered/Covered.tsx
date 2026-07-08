"use client";
import React, { useEffect } from "react";
import AOS from "aos";
import "aos/dist/aos.css";
import CoveredComp from "./CoveredComp";

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
      disable: () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    });
  }, []);

  return (
    <div className="container mx-auto w-full py-10 md:py-12">
      <div
        className="px-4 bg-[#ffffff] mx-auto text-center"
        data-aos="fade-up"
        data-aos-duration="1000"
      >
        <div>
          <h2 className="text-[#292F6C] font-bold lg:text-[48px] md:text-[29px] sm:text-[25px] text-lg md:block">
            We’ve got you covered
          </h2>
          <p className="normal text-[#7E1618] lg:text-[18px] md:text-[19px] text-[16px] leading-normal md:leading-[32px] font-medium md:block">
            Military community helping our military community move.
          </p>
        </div>
      </div>
      <div
        className="grid grid-cols-2 md:grid-cols-3 mt-4 md:mt-10 justify-center gap-2 md:gap-6 md:px-10 px-3"
        data-aos="fade-up"
        data-aos-duration="1000"
      >
        {cardsData.map((card, index) => (
          <CoveredComp
            key={index}
            card={card} // Only pass 'card' object here
          />
        ))}
      </div>
    </div>
  );
};

export default Covered;
