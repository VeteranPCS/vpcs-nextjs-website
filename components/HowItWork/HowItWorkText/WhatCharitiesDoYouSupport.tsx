import { HowItWorksContentProps } from "@/services/howItWorksService";
import howItWorksService from "@/services/howItWorksService";

const WhatCharitiesDoYouSupport = async () => {
  let pageContent: HowItWorksContentProps | null = null;

  try {
    pageContent = await howItWorksService.fetchOverviewSection(
      "what-charities-do-you-support"
    );
  } catch (error) {
    console.error("Error fetching Charities Support Content", error);
  }

  if (!pageContent) {
    return <p>Failed to load the Charities Support Content.</p>;
  }

  return (
    <>
      <div>
        <h6 className="text-[#292F6C] tahoma lg:text-[33px] md:text-[30px] sm:text-[25px] text-[25px] font-bold my-2">
          What Charities do you support?
        </h6>
      </div>
      <div className="pl-6">
        <p className="text-[#000000] roboto lg:text-[24px] md:text-[24px] sm:text-[17px] text-[17px] md:font-medium sm:font-normal font-normal">
          Coming Soon: A page exclusively featuring supported charities
          VeteranPCS supports multiple veteran-focused charities that benefit
          both service members as well as their families. If you would like to
          recommend a charity please visit our contact us page to email us.
        </p>
      </div>
    </>
  );
};

export default WhatCharitiesDoYouSupport;
