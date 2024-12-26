import Image from "next/image";
import { useState, FormEvent, useCallback, useEffect } from 'react';
import { FormData } from "@/app/get-listed-lenders/page";
import initService from '@/services/initService';
import HowDidYouHearAboutUs from "@/components/GetListedLenders/HowDidYouHearAboutUs";

interface ContactFormProps {
  onSubmit: (data: FormData) => void;
  onBack: () => void;
  formData: FormData;
}

const ContactForm = ({ onSubmit, onBack, formData }: ContactFormProps) => {
  const [localFormData, setLocalFormData] = useState<FormData>({
    firstName: formData.firstName || '',
    lastName: formData.lastName || '',
    email: formData.email || '',
    phone: formData.phone || '',
  });
  const [stateList, setStateList] = useState<any[]>([]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit(localFormData);
  };

  const handleBack = (e: FormEvent) => {
    e.preventDefault();
    onBack();
  };

  const getStateList = useCallback(async () => {
    try {
      const response = await initService.getStateList()
      setStateList(response)
    } catch (error) {
      console.error('Error fetching posts:', error)
    }
  }, []);

  useEffect(() => {
    getStateList();
  }, [getStateList])

  return (
    <div className="md:py-12 py-4 md:px-0 px-5">
      <div className="md:w-[456px] mx-auto my-10">
        <form onSubmit={handleSubmit}>
          <div className="flex flex-col gap-8">
            <div className="md:text-left text-center">
              <h1 className="text-[#7E1618] tahoma lg:text-[32px] md:text-[32px] sm:text-[24px] text-[24px] font-bold leading-8">
                Mortgage Company Info
              </h1>
            </div>
            <div className="border rounded-lg border-[#E2E4E5] p-8">
              <div className="mb-8 flex flex-col">
                <label
                  htmlFor="firstName"
                  className="text-[#242426] tahoma text-sm font-normal mb-1"
                >
                  Name
                </label>
                <input
                  className="border-b border-[#E2E4E5] px-2 py-1"
                  type="text"
                  id="firstName"
                  name="firstName"
                  placeholder="Name"
                />
              </div>
              <div className="mb-8 flex flex-col">
                <label
                  htmlFor="firstName"
                  className="text-[#242426] tahoma text-sm font-normal mb-1"
                >
                  Company NMLS ID
                </label>
                <input
                  className="border-b border-[#E2E4E5] px-2 py-1"
                  type="text"
                  id="firstName"
                  name="firstName"
                  placeholder="Company NMLS ID"
                />
              </div>
              <div className="mb-8 flex flex-col">
                <label
                  htmlFor="firstName"
                  className="text-[#242426] tahoma text-sm font-normal mb-1"
                >
                  Street
                </label>
                <input
                  className="border-b border-[#E2E4E5] px-2 py-1"
                  type="text"
                  id="firstName"
                  name="firstName"
                  placeholder="Street"
                />
              </div>
              <div className="mb-8 flex flex-col">
                <label
                  htmlFor="firstName"
                  className="text-[#242426] tahoma text-sm font-normal mb-1"
                >
                  City
                </label>
                <input
                  className="border-b border-[#E2E4E5] px-2 py-1"
                  type="text"
                  id="firstName"
                  name="firstName"
                  placeholder="City"
                />
              </div>
              <div className="mb-8 flex flex-col">
                <label
                  htmlFor="howDidYouHear"
                  className="text-[#242426] tahoma text-sm font-normal mb-1"
                >
                  State/Province
                </label>
                <select
                  id="howDidYouHear"
                  name="howDidYouHear"
                  className="border-b border-[#E2E4E5] px-2 py-1"
                >
                  <option value="" disabled selected>
                    Select State
                  </option>
                  {stateList.map((state) => (
                    <option key={state.short_name} value={state.short_name}>
                      {state.short_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mb-8 flex flex-col">
                <label
                  htmlFor="firstName"
                  className="text-[#242426] tahoma text-sm font-normal mb-1"
                >
                  Zip
                </label>
                <input
                  className="border-b border-[#E2E4E5] px-2 py-1"
                  type="text"
                  id="firstName"
                  name="firstName"
                  placeholder="Zip"
                />
              </div>
            </div>
            <HowDidYouHearAboutUs />
            <hr />
            <div className="flex md:justify-start justify-center">
              <button
                type="submit"
                className="rounded-md border border-[#BBBFC1] bg-[#292F6C] px-8 py-2 text-center text-white font-medium flex items-center gap-2 shadow-lg"
              >
                Submit Now
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <path
                    d="M14.0098 11H5.99976V13H14.0098V16L17.9998 12L14.0098 8.00003V11Z"
                    fill="#FFFFFF"
                  />
                </svg>
              </button>
            </div>
          </div>
        </form>
        <div className="flex md:justify-start justify-center mt-8">
          <button
            onClick={handleBack}
            className="rounded-md border border-[#BBBFC1] bg-white px-8 py-2 text-center text-[#242731] font-medium flex items-center gap-2 shadow-lg"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="22"
              height="24"
              viewBox="0 0 22 24"
              fill="none"
            >
              <path
                d="M9.1578 11H16.5003V13H9.1578V16L5.50031 12L9.1578 8.00003V11Z"
                fill="#242731"
              />
            </svg>
            Back
          </button>
        </div>
      </div>
    </div>
  );
};

export default ContactForm;