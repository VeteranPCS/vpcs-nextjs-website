import React from "react"; // No need for useState or useEffect
import "@/styles/globals.css";
import Image from "next/image";

const SkillFuturesBuild = () => {
  return (
    <div className="w-full relative lg:py-12 sm:py-5 py-5 lg:px-0 px-5">
      <div className="">
        <div className="container mx-auto ">
          <div className="grid lg:grid-cols-2 md:grid-cols-1 sm:grid-cols-1 grid-cols-1 justify-center xl:gap-10 lg:gap-10 md:gap-10 sm:gap-2 gap-2 xl:px-10 lg:px-10 md:px-10 sm:px-3 px-3">
            <div className="text-center">
              <h2 className="text-[#292F6C] text-center tahoma lg:text-[45] md:text-[45px] sm:text-[31px] text-[31px] font-bold">
                The Details
              </h2>
              <Image
                width={237}
                height={209}
                src="/icon/VeteranPCS-logo_wht-outline.svg"
                alt="check"
                className="w-[237px] h-[209px] mx-auto"
              />
            </div>
            <div>
              <ul>
                <li className="text-[#000000] roboto lg:text-lg md:text-lg sm:text-sm text-sm font-medium list-disc">
                  Individual Internships can be set up as part of the Career
                  Skills Program or DoD Skill Bridge Program within six months
                  of your separation date
                </li>
                <li className="text-[#000000] roboto lg:text-lg md:text-lg sm:text-sm text-sm font-medium list-disc">
                  Individual Internships are also available for Military Spouses
                  and Veterans
                </li>
                <li className="text-[#000000] roboto lg:text-lg md:text-lg sm:text-sm text-sm font-medium list-disc">
                  Cost for the internship through VeteranPCS is $250
                </li>
                <li className="text-[#000000] roboto lg:text-lg md:text-lg sm:text-sm text-sm font-medium list-disc">
                  Licensing costs and requirements vary by state. You can choose
                  the licensing option that best suits you.
                </li>
                <li className="text-[#000000] roboto lg:text-lg md:text-lg sm:text-sm text-sm font-medium list-disc">
                  Internship length of time can be custom-tailored to your
                  needs/timeline
                </li>
                <li className="text-[#000000] roboto lg:text-lg md:text-lg sm:text-sm text-sm font-medium list-disc">
                  Interview multiple agents and choose the agent and brokerage
                  that best suit you for the internship
                </li>
                <li className="text-[#000000] roboto lg:text-lg md:text-lg sm:text-sm text-sm font-medium list-disc">
                  When complete you have the opportunity to select whichever
                  brokerage you want for your new career
                </li>
                <li className="text-[#000000] roboto lg:text-lg md:text-lg sm:text-sm text-sm font-medium list-disc">
                  VeteranPCS cannot guarantee placement on the website when
                  complete
                </li>
                <li className="text-[#000000] roboto lg:text-lg md:text-lg sm:text-sm text-sm font-medium list-disc">
                  Once you have your license you can apply to be listed on
                  VeteranPCS
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SkillFuturesBuild;
