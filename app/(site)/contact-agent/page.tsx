"use client";
import ContactAgents from "@/components/ContactAgents/ContactAgent";
import { contactAgentPostForm } from "@/services/salesForcePostFormsService";
import { useRouter } from 'next/navigation'
import { sendGTMEvent } from "@next/third-parties/google";

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  currentBase?: string;
  destinationBase?: string;
  howDidYouHear?: string;
  tellusMore?: string;
  additionalComments?: string;
  status_select?: string;
  branch_select?: string;
  discharge_status?: string;
  state?: string;
  city?: string;
  buyingSelling?: string;
  timeframe?: string;
  typeOfHome?: string | null;
  bedrooms?: string;
  bathrooms?: string;
  maxPrice?: string;
  preApproval?: string | null;
  captchaToken?: string;
}

export default function ContactAgentPage() {
  const router = useRouter()

  const handleSubmit = async (formData: FormData) => {
    const fullQueryString = window.location.search;
    const queryParams = new URLSearchParams(fullQueryString);

    try {
      sendGTMEvent({
        event: "conversion_contact_agent",
        agent_id: queryParams.get("id") || "",
        state: queryParams.get("state") || "",
      });

      const server_response = await contactAgentPostForm(formData, fullQueryString);

      if (server_response?.redirectUrl) {
        router.push(server_response.redirectUrl);
      } else {
        console.log("No redirect URL found");
      }
    } catch (error) {
      console.error("Error submitting form:", error);
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