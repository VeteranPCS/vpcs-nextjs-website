"use client";
import { useState, FormEvent, useCallback, useEffect } from 'react';
import { FormData } from "@/app/get-listed-lenders/page";
import initService from '@/services/initService';
import stateService from "@/services/stateService";

interface ContactFormProps {
  onSubmit: (formData: FormData) => void;
  formData: FormData;
}

const ContactForm = ({ onSubmit, formData }: ContactFormProps) => {
  const [stateList, setStateList] = useState<any[]>([]);
  const [localFormData, setLocalFormData] = useState<FormData>({
    firstName: formData.firstName || '',
    lastName: formData.lastName || '',
    email: formData.email || '',
    phone: formData.phone || '',
  });

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit(localFormData);
  };

  const getStateList = useCallback(async () => {
    try {
      const response = await stateService.fetchStateList()
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
                Current Location
              </h1>
            </div>
            <div className="border rounded-lg border-[#E2E4E5] p-8">
              <div>
                <div className="mb-8 flex flex-col">
                  <label
                    htmlFor="howDidYouHear"
                    className="text-[#242426] tahoma text-sm font-normal mb-1"
                  >
                    State*
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
                <div className="flex flex-col">
                  <label
                    htmlFor="howDidYouHear"
                    className="text-[#242426] tahoma text-sm font-normal mb-1"
                  >
                    City*
                  </label>
                  <input
                    className="border-b border-[#E2E4E5] px-2 py-1"
                    type="text"
                    id="cityName"
                    name="cityName"
                    placeholder="Enter City"
                  />
                </div>
              </div>
            </div>
            <div className="flex md:justify-start justify-center">
              <button
                type="submit"
                className="rounded-md border border-[#BBBFC1] bg-[#292F6C] px-8 py-2 text-center text-white font-medium flex items-center gap-2 shadow-lg"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <path
                    d="M8.99991 16.17L4.82991 12L3.40991 13.41L8.99991 19L20.9999 7L19.5899 5.59L8.99991 16.17Z"
                    fill="white"
                  />
                </svg>
                Submit
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ContactForm;