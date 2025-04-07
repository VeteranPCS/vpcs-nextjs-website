import React from "react";
import "@/app/globals.css";
import CTASection from "@/components/common/CTASection";

const BlogDetailsCta = () => {
  const buttons = [
    { text: "Find An Agent", link: "/contact-agent" },
    { text: "Find A Lender", link: "/contact-lender" },
  ];

  return (
    <CTASection
      backgroundImage="/assets/flagagent.webp"
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
      containerClassName="sm:mb-12"
    />
  );
};

export default BlogDetailsCta;