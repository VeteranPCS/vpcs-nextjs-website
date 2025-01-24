"use client";
import { useEffect, useState } from "react";
import GetListedAgents from "@/components/GetListedAgents/GetListedAgentsContactDiane";
import CurrentLocation from "@/components/GetListedAgents/CurrentLocation";
import AgentInfo from "@/components/GetListedAgents/AgentInfo";
import Image from "next/image";
import GetListedLendersProfileInfo from "@/components/GetListedLenders/GetListedLendersProfileInfo";
import { GetListedAgentsPostForm } from "@/services/salesForcePostFormsService";
import { useRouter } from 'next/navigation'
import { sendGTMEvent } from "@next/third-parties/google";

export default function Home() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [formData, setFormData] = useState({});
  const [shouldSubmitForm, setShouldSubmitForm] = useState<boolean>(false);

  const shouldSubmit = () => {
    setShouldSubmitForm(true)
  }

  const handleNext = () => {
    setCurrentStep(prev => Math.min(prev + 1, 4));
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = (stepData: any) => {
    setFormData(prev => ({
      ...prev,
      ...stepData
    }));
    handleNext();
  };

  useEffect(() => {
    const handleFormSubmission = async () => {
      try {
        sendGTMEvent({
          event: 'conversion_get_listed_agents',
        });
        const server_response = await GetListedAgentsPostForm(formData);
        if (server_response?.redirectUrl) {
          router.push(server_response.redirectUrl);
        } else {
          console.log("No redirect URL found");
        }
      } catch (error) {
        console.error('Error submitting form:', error);
      }
    };

    if (shouldSubmitForm) {
      handleFormSubmission();
    }
  }, [formData, shouldSubmitForm, router]);

  const renderProgressBar = () => {
    return (
      <div className="flex md:justify-start justify-center">
        <div className="flex items-center gap-4">
          <span className={`border rounded-full w-5 h-5 p-[1px] ${currentStep >= 1 ? 'bg-[#000080]' : 'bg-[#FFFFFF] border-[#B9B9C3]'}`}></span>
          <span className={`border w-10 p-[1px] ${currentStep >= 1 ? 'bg-[#000080]' : 'bg-[#B9B9C3]'}`}></span>
          <span className={`border rounded-full w-5 h-5 p-[1px] ${currentStep >= 2 ? 'bg-[#000080]' : 'bg-[#FFFFFF] border-[#B9B9C3]'}`}></span>
          <span className={`border w-10 p-[1px] ${currentStep >= 2 ? 'bg-[#000080]' : 'bg-[#B9B9C3]'}`}></span>
          <span className={`border rounded-full w-5 h-5 p-[1px] ${currentStep >= 3 ? 'bg-[#000080]' : 'bg-[#FFFFFF] border-[#B9B9C3]'}`}></span>
          <span className={`border w-10 p-[1px] ${currentStep >= 3 ? 'bg-[#000080]' : 'bg-[#B9B9C3]'}`}></span>
          <span className={`border rounded-full w-5 h-5 p-[1px] ${currentStep >= 4 ? 'bg-[#000080]' : 'bg-[#FFFFFF] border-[#B9B9C3]'}`}></span>
        </div>
      </div>
    );
  };

  return (
    <>
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
          <div>
            <button>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="48"
                height="48"
                viewBox="0 0 48 48"
                fill="none"
              >
                <path
                  d="M38 12.82L35.18 10L24 21.18L12.82 10L10 12.82L21.18 24L10 35.18L12.82 38L24 26.82L35.18 38L38 35.18L26.82 24L38 12.82Z"
                  fill="#E2E4E6"
                />
              </svg>
            </button>
          </div>
        </div>

        <div className="md:w-[456px] w-auto md:mx-auto md:-mt-6 mt-10 mx-5">
          {renderProgressBar()}
        </div>

        {currentStep === 1 && (
          <GetListedAgents 
            onSubmit={handleSubmit}
          />
        )}
        
        {currentStep === 2 && (
          <GetListedLendersProfileInfo 
            onSubmit={handleSubmit}
            onBack={handleBack}
            shouldValidate={true}
          />
        )}
        
        {currentStep === 3 && (
          <CurrentLocation 
            onSubmit={handleSubmit}
            onBack={handleBack}
          />
        )}

        {currentStep === 4 && (
          <AgentInfo 
            onBack={handleBack}
            onSubmit={handleSubmit}
            shouldSubmit={shouldSubmit}
          />
        )}
      </div>
    </>
  );
}