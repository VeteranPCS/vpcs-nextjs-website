import Image from "next/image";
import { useState, FormEvent } from 'react';
import { FormData } from "@/app/get-listed-lenders/page";

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

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit(localFormData);
  };

  const handleBack = (e: FormEvent) => {
    e.preventDefault();
    onBack();
  };

  return (
    <div className="md:py-12 py-4 md:px-0 px-5">
      <div className="md:w-[456px] mx-auto my-10">
        <form onSubmit={handleSubmit}>
          <div className="flex flex-col gap-8">
            <div className="md:text-left text-center">
              <h1 className="text-[#7E1618] tahoma lg:text-[32px] md:text-[32px] sm:text-[24px] text-[24px] font-bold leading-8">
                Contact Us
              </h1>
              <h2 className="text-[#242426] my-2 tahoma lg:text-[23px] md:text-[22px] sm:text-[18px] text-[18px] font-bold leading-6">No spam mail, no fees. VeteranPCS is free to use.</h2>
              <p className="text-[#575F6E] roboto text-base font-black mt-8">This form is simply used to generate an email with your agents information and begin qualifying you for your Move In Bonus after you close.</p>
            </div>
            <div className="border rounded-lg border-[#E2E4E5] p-8">
              <div>
                <div className="mb-8 flex flex-col">
                  <label
                    htmlFor="firstName"
                    className="text-[#242426] tahoma text-sm font-normal mb-1"
                  >
                    First name*
                  </label>
                  <input
                    className="border-b border-[#E2E4E5] px-2 py-1"
                    type="text"
                    id="firstName"
                    name="firstName"
                    placeholder="Alexander"
                    value={localFormData.firstName}
                  />
                </div>
                <div className="mb-8 flex flex-col">
                  <label
                    htmlFor="lastName"
                    className="text-[#242426] tahoma text-sm font-normal mb-1"
                  >
                    Last name*
                  </label>
                  <input
                    className="border-b border-[#E2E4E5] px-2 py-1"
                    type="text"
                    id="lastName"
                    name="lastName"
                    placeholder="Smith"
                    value={localFormData.lastName}
                  />
                </div>
                <div className="mb-8 flex flex-col relative">
                  <label
                    htmlFor="email"
                    className="text-[#242426] tahoma text-sm font-normal mb-1"
                  >
                    Email*
                  </label>
                  <div className="flex items-center border-b border-[#E2E4E5]">
                    <input
                      className="pl-12 py-1 w-full"
                      type="email"
                      id="email"
                      name="email"
                      placeholder="alex_manager@gmail.com"
                    />
                    <span className="absolute left-1 w-6 h-6 text-[#B1B3B8]">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <path
                          d="M22 6C22 4.9 21.1 4 20 4H4C2.9 4 2 4.9 2 6V18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6ZM20 6L12 11L4 6H20ZM20 18H4V8L12 13L20 8V18Z"
                          fill="#D5D5D5"
                        />
                      </svg>
                    </span>
                  </div>
                </div>
                <div className="mb-8 flex flex-col relative">
                  <label
                    htmlFor="phone"
                    className="text-[#242426] tahoma text-sm font-normal mb-1"
                  >
                    Phone*
                  </label>
                  <div className="flex items-center border-b border-[#E2E4E5]">
                    <input
                      className="border-b border-[#E2E4E5] pl-12 py-1"
                      type="tel"
                      id="phone"
                      name="phone"
                      placeholder="+1 555 555-1234"
                      value={localFormData.phone}
                    />
                    <span className="absolute left-1 w-6 h-6 text-[#B1B3B8]">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <path
                          d="M20.9999 15.46L15.7299 14.85L13.2099 17.37C10.3799 15.93 8.0599 13.62 6.6199 10.78L9.1499 8.25L8.5399 3H3.0299C2.4499 13.18 10.8199 21.55 20.9999 20.97V15.46Z"
                          fill="#D5D5D5"
                        />
                      </svg>
                    </span>
                  </div>
                </div>
                <div className="mb-8 flex flex-col">
                  <label
                    htmlFor="lastName"
                    className="text-[#242426] tahoma text-sm font-normal mb-1"
                  >
                    Current Base/City*
                  </label>
                  <input
                    className="border-b border-[#E2E4E5] px-2 py-1"
                    type="text"
                    id="lastName"
                    name="lastName"
                    placeholder="Current Base/City"
                  />
                </div>
                <div className="mb-8 flex flex-col">
                  <label
                    htmlFor="lastName"
                    className="text-[#242426] tahoma text-sm font-normal mb-1"
                  >
                    Destination Base/City*
                  </label>
                  <input
                    className="border-b border-[#E2E4E5] px-2 py-1"
                    type="text"
                    id="lastName"
                    name="lastName"
                    placeholder="Destination Base/City"
                  />
                </div>
                <div className="mb-8 flex flex-col">
                  <label
                    htmlFor="howDidYouHear"
                    className="text-[#242426] tahoma text-sm font-normal mb-1"
                  >
                    How Did You Hear About Us?*:
                  </label>
                  <select
                    id="howDidYouHear"
                    name="howDidYouHear"
                    className="border-b border-[#E2E4E5] px-2 py-1"
                  >
                    <option value="" disabled selected>
                      Select an option
                    </option>
                    <option value="friend">A friend</option>
                    <option value="advertisement">Advertisement</option>
                    <option value="socialMedia">Social Media</option>
                    <option value="searchEngine">Search Engine</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="flex flex-col">
                  <label
                    htmlFor="lastName"
                    className="text-[#242426] tahoma text-sm font-normal mb-1"
                  >
                    Additional Comments:
                  </label>
                  <textarea
                    className="border-b border-[#E2E4E5] px-2 py-1"
                    id="lastName"
                    name="lastName"
                    placeholder="Additional Comments"
                  />
                </div>
              </div>
            </div>

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