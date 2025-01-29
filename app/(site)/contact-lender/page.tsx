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
  captchaToken?: string;
  captcha_settings?: string;
}

export default function Home() {
  const router = useRouter()

  const handleSubmit = async (formData: FormData) => {
    try {
      const fullQueryString = window.location.search;
      const queryParams = new URLSearchParams(fullQueryString);
      sendGTMEvent({
        event: "conversion_contact_lender",
        agent_id: queryParams.get('id') || "",
        state: queryParams.get('state') || "",
      });

      const server_response = await contactLenderPostForm(formData, fullQueryString);
      if (server_response?.redirectUrl) {
        router.push(server_response.redirectUrl);
      } else {
        console.log("No redirect URL found");
      }
    } catch (error) {
      console.error('Error submitting form:', error);
    }
  };

  return (
    <div className="container mx-auto w-full">
      <div className="flex flex-wrap md:flex-nowrap justify-between items-center md:pt-[140px] pt-[80px] md:mx-0 mx-5">
        <div>
          <Image
            src="/assets/Logo.png"
            className="w-[238px] h-[62px]"
            alt="contact us"
            width={400}
            height={400}
          />
        </div>
      </div>

      <ContactLender
        onSubmit={handleSubmit}
      />
    </div>
  );
}