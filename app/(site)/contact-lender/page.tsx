"use client";
import { useEffect, useState } from "react";
import ContactLender from "@/components/ContactLender/ContactLender";
import { submitContactLenderLead } from "./actions";
import { sendGTMEvent } from "@next/third-parties/google";
import { normalizeStateCode, normalizeStateSlug } from "@/lib/states";
import { ContactLenderFormData } from "@/types";
import { formTrackingPayload } from "@/lib/analytics/client";
import type { CustomerSubmitResult } from "@/lib/leads/submission-outcome";

export default function ContactLenderPage() {
  const [derivedStateCode, setDerivedStateCode] = useState<string | null>(null);

  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    setDerivedStateCode(normalizeStateCode(queryParams.get("state")));
  }, []);

  const handleSubmit = async (formData: ContactLenderFormData): Promise<CustomerSubmitResult> => {
    const fullQueryString = window.location.search;
    const queryParams = new URLSearchParams(fullQueryString);

    try {
      // Comparator telemetry is optional and must never prevent lead delivery.
      try { sendGTMEvent({
        event: "conversion_contact_lender",
        agent_id: queryParams.get('id') || "",
        state: normalizeStateSlug(queryParams.get('state')) || "",
      }); } catch { /* Keep existing GTM semantics, best effort. */ }

      const result = await submitContactLenderLead(
        { ...formData, ...formTrackingPayload('contact_lender') },
        fullQueryString,
      );
      return result;
    } catch (error) {
      console.error('Error submitting form:', error);
      return { success: false, outcome: 'unconfirmed' };
    }
  };

  return (
    <div className="container mx-auto w-full">
      <div className="flex flex-wrap md:flex-nowrap justify-between items-center md:pt-[140px] pt-[80px] md:mx-0 mx-5">
      </div>
      <ContactLender
        onSubmit={handleSubmit}
        derivedStateCode={derivedStateCode}
      />
    </div>
  );
}
