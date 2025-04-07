"use client"
import React from "react";
import "@/app/globals.css";
import CTASection from "@/components/common/CTASection";

const BlogCta = () => {
  const buttons = [
    { text: "Find An Agent", link: "/#map-container" },
    { text: "Find A Lender", link: "/#map-container" },
  ];

  return (
    <CTASection
      backgroundImage="/assets/blogctabgimage.webp"
      title={
        <>
          <h2 className="text-[#FFFFFF] tahoma lg:text-[40px] md:text-[40px] sm:text-[30px] text-[30px] font-bold mb-4">
            Buying Or Selling
          </h2>
          <h2 className="text-[#FFFFFF] tahoma lg:text-[40px] md:text-[40px] sm:text-[30px] text-[30px] font-bold mt-6">
            VA Loan Expert
          </h2>
        </>
      }
      buttons={buttons}
      image={{
        src: "/assets/blogpcsright.png",
        alt: "Blog PCS right",
        width: 1000,
        height: 1000,
        className: "w-auto h-auto object-cover",
      }}
      containerClassName="py-[50px]"
    />
  );
};

export default BlogCta;