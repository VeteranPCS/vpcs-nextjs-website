"use client";
import { useEffect, useState } from "react";
import ContactLender from "@/components/ContactLender/ContactLender";
import { contactLenderPostForm } from "@/services/salesForcePostFormsService";
import { useRouter } from 'next/navigation'
import { sendGTMEvent } from "@next/third-parties/google";
import { normalizeStateCode, normalizeStateSlug } from "@/lib/states";
import { ContactLenderFormData } from "@/types";
import { formTrackingPayload } from "@/lib/analytics/client";

export default function ContactLenderPage() {
  const router = useRouter()
  const [derivedStateCode, setDerivedStateCode] = useState<string | null>(null);

  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    setDerivedStateCode(normalizeStateCode(queryParams.get("state")));
  }, []);

  const handleSubmit = async (formData: ContactLenderFormData): Promise<{ success?: boolean; redirectUrl?: string }> => {
    const fullQueryString = window.location.search;
    const queryParams = new URLSearchParams(fullQueryString);

    try {
      sendGTMEvent({
        event: "conversion_contact_lender",
        agent_id: queryParams.get('id') || "",
        state: normalizeStateSlug(queryParams.get('state')) || "",
      });

      // Enhanced contactLenderPostForm now includes:
      // - Automatic retry logic (up to 3 attempts)
      // - Better Salesforce response validation
      // - Exponential backoff between retries
      // - Proper error handling and logging
      const server_response = await contactLenderPostForm(
        { ...formData, ...formTrackingPayload() },
        fullQueryString,
      );
      // Only proceed to thank-you when Salesforce returned a redirect; otherwise treat as a failed submission.
      if (server_response?.redirectUrl) {
        router.push(server_response.redirectUrl);
        return { success: true, redirectUrl: server_response.redirectUrl };
      }
      return { success: false };
    } catch (error) {
      console.error('Error submitting form:', error);
      return { success: false };
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
