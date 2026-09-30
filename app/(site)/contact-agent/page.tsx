"use client";
import { useEffect, useState } from "react";
import ContactAgents from "@/components/ContactAgents/ContactAgent";
import { submitContactAgentLead } from "./actions";
import { sendGTMEvent } from "@next/third-parties/google";
import { ContactAgentFormData } from "@/types";
import { normalizeStateCode, normalizeStateSlug } from "@/lib/states";
import { formTrackingPayload } from "@/lib/analytics/client";
import type { CustomerSubmitResult } from "@/lib/leads/submission-outcome";

export default function ContactAgentPage() {
  const [derivedStateCode, setDerivedStateCode] = useState<string | null>(null);

  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    setDerivedStateCode(normalizeStateCode(queryParams.get("state")));
  }, []);

  const handleSubmit = async (formData: ContactAgentFormData): Promise<CustomerSubmitResult> => {
    const fullQueryString = window.location.search;
    const queryParams = new URLSearchParams(fullQueryString);
    const queryState = queryParams.get("state");

    try {
      // Comparator telemetry is optional and must never prevent lead delivery.
      try { sendGTMEvent({
        event: "conversion_contact_agent",
        agent_id: queryParams.get("id") || "",
        state: normalizeStateSlug(queryState) || "",
      }); } catch { /* Keep existing GTM semantics, best effort. */ }

      const result = await submitContactAgentLead(
        { ...formData, ...formTrackingPayload('contact_agent') },
        fullQueryString,
      );
      return result;
    } catch (error) {
      console.error("Error submitting form:", error);
      return { success: false, outcome: 'unconfirmed' };
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
        derivedStateCode={derivedStateCode}
      />
    </div>
  );
}
