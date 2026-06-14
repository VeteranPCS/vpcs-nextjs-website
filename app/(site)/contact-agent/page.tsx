"use client";
import ContactAgents from "@/components/ContactAgents/ContactAgent";
import { submitContactAgentLead } from "./actions";
import { sendGTMEvent } from "@next/third-parties/google";
import { ContactAgentFormData } from "@/types";

export default function ContactAgentPage() {
  const handleSubmit = async (formData: ContactAgentFormData): Promise<{ success?: boolean; redirectUrl?: string }> => {
    const fullQueryString = window.location.search;
    const queryParams = new URLSearchParams(fullQueryString);

    try {
      sendGTMEvent({
        event: "conversion_contact_agent",
        agent_id: queryParams.get("id") || "",
        state: queryParams.get("state") || "",
      });

      return await submitContactAgentLead(formData, fullQueryString);
    } catch (error) {
      console.error("Error submitting form:", error);
      return { success: false };
    }
  };

  // const renderProgressBar = () => {
  //   return (
  //     <div className="flex md:justify-start justify-center">
  //       <div className="flex items-center gap-4">
  //         <span className={`border rounded-full w-5 h-5 p-[1px] ${currentStep >= 1 ? 'bg-[#000080]' : 'bg-[#FFFFFF] border-[#B9B9C3]'}`}></span>
  //         <span className={`border w-10 p-[1px] ${currentStep >= 1 ? 'bg-[#000080]' : 'bg-[#B9B9C3]'}`}></span>
  //         <span className={`border rounded-full w-5 h-5 p-[1px] ${currentStep >= 2 ? 'bg-[#000080]' : 'bg-[#FFFFFF] border-[#B9B9C3]'}`}></span>
  //         <span className={`border w-10 p-[1px] ${currentStep >= 2 ? 'bg-[#000080]' : 'bg-[#B9B9C3]'}`}></span>
  //         <span className={`border rounded-full w-5 h-5 p-[1px] ${currentStep >= 3 ? 'bg-[#000080]' : 'bg-[#FFFFFF] border-[#B9B9C3]'}`}></span>
  //         <span className={`border w-10 p-[1px] ${currentStep >= 3 ? 'bg-[#000080]' : 'bg-[#B9B9C3]'}`}></span>
  //         <span className={`border rounded-full w-5 h-5 p-[1px] ${currentStep >= 4 ? 'bg-[#000080]' : 'bg-[#FFFFFF] border-[#B9B9C3]'}`}></span>
  //       </div>
  //     </div>
  //   );
  // };

  return (
    <div className="container mx-auto w-full">
      <div className="flex flex-wrap md:flex-nowrap justify-between items-center md:pt-[140px] pt-[80px] md:mx-0 mx-5">
      </div>
      <ContactAgents
        onSubmit={handleSubmit}
      />
    </div>
  );
}
