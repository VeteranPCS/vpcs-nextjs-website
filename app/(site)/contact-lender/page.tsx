"use client";
import Image from "next/image";
import ContactLender from "@/components/ContactLender/ContactLender";
import { contactLenderPostForm } from "@/services/salesForcePostFormsService";
import { useRouter } from 'next/navigation'
import { sendGTMEvent } from "@next/third-parties/google";

export interface FormData {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  currentBase?: string;
  destinationBase?: string;
  additionalComments?: string | null;
  howDidYouHear?: string;
  tellusMore?: string;
}

export default function ContactLenderPage() {
  const router = useRouter()

  const handleSubmit = async (formData: FormData): Promise<{ success?: boolean; redirectUrl?: string }> => {
    const fullQueryString = window.location.search;
    const queryParams = new URLSearchParams(fullQueryString);

    try {
      sendGTMEvent({
        event: "conversion_contact_lender",
        agent_id: queryParams.get('id') || "",
        state: queryParams.get('state') || "",
      });

      // Enhanced contactLenderPostForm now includes:
      // - Automatic retry logic (up to 3 attempts)
      // - Better Salesforce response validation
      // - Exponential backoff between retries
      // - Proper error handling and logging
      const server_response = await contactLenderPostForm(formData, fullQueryString);
      // contactLenderPostForm throws on failure, so any return means the lead was accepted.
      // Use Salesforce's redirect when present, otherwise fall back to our own /thank-you.
      const destination = server_response?.redirectUrl || "/thank-you";
      router.push(destination);
      return { success: true, redirectUrl: destination };
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
      />
    </div>
  );
}