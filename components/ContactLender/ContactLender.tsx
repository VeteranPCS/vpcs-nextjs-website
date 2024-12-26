import { useState, ChangeEvent, FormEvent } from 'react';
import { FormData } from "@/app/get-listed-lenders/page";
import Link from "next/link";
import HowDidYouHearAboutUs from '../GetListedLenders/HowDidYouHearAboutUs';

interface ContactFormProps {
  onSubmit: (formData: FormData) => void;
  formData: FormData;
}

const ContactForm = ({ onSubmit, formData }: ContactFormProps) => {
  const [localFormData, setLocalFormData] = useState<FormData>({
    firstName: formData.firstName || '',
    lastName: formData.lastName || '',
    email: formData.email || '',
    phone: formData.phone || '',
  });

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLocalFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit(localFormData);
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
              <p className="text-[#575F6E] roboto text-base font-black mt-3">
                This information is strictly used to connect you and the lender directly. Be sure to check your spam/junk folder if you do not receive a confirmation email.
              </p>
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
                    onChange={handleChange}
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
                    onChange={handleChange}
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
                      value={localFormData.email}
                      onChange={handleChange}
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
                      onChange={handleChange}
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
                <div className="flex flex-col">
                  <label
                    htmlFor="additional_comments"
                    className="text-[#242426] tahoma text-sm font-normal mb-1"
                  >
                    Additional Comments
                  </label>
                  <textarea
                    className="border-b border-[#E2E4E5] px-2 py-1"
                    // type="text"
                    id="additional_comments"
                    name="additional_comments"
                    placeholder="Destination Base/City"
                  />
                </div>
              </div>
            </div>
            <HowDidYouHearAboutUs />
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
      </div>
    </div>
  );
};

export default ContactForm;