"use client";
import { useIntakeMaintenanceFeedback } from '@/components/common/IntakeMaintenance';
import { useEffect, useState, useRef } from "react";
import GetListedAgents from "@/components/GetListedAgents/GetListedAgents";
import CurrentLocation from "@/components/GetListedAgents/CurrentLocation";
import AgentInfo from "@/components/GetListedAgents/AgentInfo";
import Image from "next/image";
import GetListedLendersProfileInfo from "@/components/GetListedLenders/GetListedLendersProfileInfo";
import Link from "next/link";
import { GetListedAgentsPostForm } from "@/services/salesForcePostFormsService";
import { useRouter } from 'next/navigation'
import { sendGTMEvent } from "@next/third-parties/google";
import { useHoneypot, HoneypotField } from '@/components/common/honeypot';

export default function GetListedAgentsPage() {
  const { maintenanceNotice, handleMaintenanceResult } = useIntakeMaintenanceFeedback();
  const submissionBusy = useRef(false);
  const requestStarted = useRef(false);
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [formData, setFormData] = useState({});
  const [shouldSubmitForm, setShouldSubmitForm] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const { ref: honeypotRef, getSpamFields } = useHoneypot();

  const shouldSubmit = () => {
    if (submissionBusy.current) return;
    submissionBusy.current = true;
    setIsSubmitting(true);
    setShouldSubmitForm(true);
  }

  const handleNext = () => {
    setCurrentStep(prev => Math.min(prev + 1, 4));
  };

  const handleBack = (stepData: object) => {
    if (submissionBusy.current) return;
    setFormData(prev => ({ ...prev, ...stepData }));
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (stepData: any): Promise<{ success?: boolean; redirectUrl?: string }> => {
    if (submissionBusy.current) return {};
    setFormData(prev => ({
      ...prev,
      ...stepData
    }));
    handleNext();
    return Promise.resolve({ success: true });
  };

  useEffect(() => {
    const handleFormSubmission = async () => {
      let accepted = false;
      try {
        const server_response = await GetListedAgentsPostForm({ ...formData, ...getSpamFields() });
        if (handleMaintenanceResult(server_response)) return;
        // Only proceed to thank-you when Salesforce returned a redirect; otherwise treat as a failed submission.
        if (server_response?.redirectUrl) {
          // Stay locked even if navigation is slow or throws after acceptance.
          accepted = true;
          try {
            sendGTMEvent({ event: 'conversion_get_listed_agents' });
          } catch { /* Optional telemetry must not undo accepted capture. */ }
          router.push(server_response.redirectUrl);
        } else {
          console.error('No redirect URL found');
        }
      } catch (error) {
        console.error('Error submitting form:', error);
      } finally {
        setShouldSubmitForm(false);
        if (!accepted) {
          requestStarted.current = false;
          submissionBusy.current = false;
          setIsSubmitting(false);
        }
      }
    };

    if (shouldSubmitForm && !requestStarted.current) {
      requestStarted.current = true;
      handleFormSubmission();
    }
  }, [formData, shouldSubmitForm, router, getSpamFields, handleMaintenanceResult]);

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
        <HoneypotField ref={honeypotRef} />
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
            <Link href="/" aria-label="Close and return to homepage">
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
            </Link>
          </div>
        </div>

        <div className="md:w-[456px] w-auto md:mx-auto md:-mt-6 mt-10 mx-5">
          {maintenanceNotice}
          {renderProgressBar()}
        </div>

        {currentStep === 1 && (
          <GetListedAgents
            initialValues={formData}
            onSubmit={handleSubmit}
          />
        )}

        {currentStep === 2 && (
          <GetListedLendersProfileInfo
            initialValues={formData}
            onSubmit={handleSubmit}
            onBack={handleBack}
            shouldValidate={true}
          />
        )}

        {currentStep === 3 && (
          <CurrentLocation
            initialValues={formData}
            onSubmit={handleSubmit}
            onBack={handleBack}
          />
        )}

        {currentStep === 4 && (
          <AgentInfo
            initialValues={formData}
            isSubmitting={isSubmitting}
            onBack={handleBack}
            onSubmit={handleSubmit}
            shouldSubmit={shouldSubmit}
          />
        )}
      </div>
    </>
  );
}
