import React from "react"; // No need for useState or useEffect
import "@/app/globals.css";
import Button from "@/components/common/Button";
import internshipPageService from "@/services/internshipPageService";

export interface IntershipOfferDataProps {
  title: string;
  details: string;
  button_text: string;
}

const receiveoffcourses = async () => {
  let internshipOffer: IntershipOfferDataProps | null = null;

  try {
    internshipOffer = await internshipPageService.fetchInternshipOffer();
  } catch (error) {
    console.error("Failed to fetch Internship Action Items:", error);
    return <p>Failed to load Internship Action Items.</p>;
  }

  return (
    <div className="w-full">
      <div className="bg-[#002258] lg:py-12 sm:py-5 py-5 lg:px-0 px-5">
        <div className="container mx-auto ">
          <div className="">
            <div className="text-center">
              <h1 className="text-white lg:text-[32px] md:text-[32px] sm:text-[32px] text-[32px] font-bold poppins lg:w-[800px] md:w-[800px] sm:w-full w-full mx-auto">
                {internshipOffer?.title}
              </h1>
              <p className="text-[#FFFFFF] text-center roboto lg:text-lg md:text-lg sm:text-sm text-sm font-medium lg:w-[900px] md:w-[900px] sm:w-full w-full mx-auto pt-5">
                {/* VeteranPCS has partnered with the CE Shop to offer a 40%
                discount to get your real estate license. Discount is available
                for active duty, veterans, and military spouses. */}
                {internshipOffer?.details}
              </p>
              <p className="text-[#FFFFFF] text-center roboto lg:text-lg md:text-lg sm:text-sm text-sm font-medium lg:w-[900px] md:w-[900px] sm:w-full w-full mx-auto pt-5 py-5">
                Use code ‘FREEDOM40′ at checkout!
              </p>
              <Button
                buttonText={internshipOffer?.button_text || "40% off training"}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default receiveoffcourses;
