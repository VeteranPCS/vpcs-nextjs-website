import { useState, ChangeEvent, FormEvent } from 'react';
import { FormData } from "@/app/get-listed-lenders/page";
import Link from "next/link";

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
                Optional Information for Buyer
              </h1>
            </div>
            <div className="border rounded-lg border-[#E2E4E5] p-8">
              <div>
                <div className="mb-8 flex flex-col">
                  <label
                    htmlFor="howDidYouHear"
                    className="text-[#242426] tahoma text-sm font-normal mb-1"
                  >
                    Type of Home:
                  </label>
                  <select
                    id="howDidYouHear"
                    name="howDidYouHear"
                    className="border-b border-[#E2E4E5] px-2 py-1"
                  >
                    <option value="" disabled selected>
                      --None--
                    </option>
                    <option value="Single Family">Single Family</option>
                    <option value="Townhouse">Townhouse</option>
                    <option value="Duplex">Duplex</option>
                    <option value="Condo">Condo</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="mb-8 flex flex-col">
                  <label
                    htmlFor="howDidYouHear"
                    className="text-[#242426] tahoma text-sm font-normal mb-1"
                  >
                    How many Bedrooms are you looking for?:
                  </label>
                  <select
                    id="howDidYouHear"
                    name="howDidYouHear"
                    className="border-b border-[#E2E4E5] px-2 py-1"
                  >
                    <option value="" disabled selected>
                      --None--
                    </option>
                    <option value="1+">1+</option>
                    <option value="2+">2+</option>
                    <option value="3+">3+</option>
                    <option value="4+">4+</option>
                    <option value="5+">5+</option>
                  </select>
                </div>
                <div className="mb-8 flex flex-col">
                  <label
                    htmlFor="howDidYouHear"
                    className="text-[#242426] tahoma text-sm font-normal mb-1"
                  >
                    How many Bathrooms are you looking for?:
                  </label>
                  <select
                    id="howDidYouHear"
                    name="howDidYouHear"
                    className="border-b border-[#E2E4E5] px-2 py-1"
                  >
                    <option value="" disabled selected>
                      --None--
                    </option>
                    <option value="1+">1+</option>
                    <option value="2+">2+</option>
                    <option value="3+">3+</option>
                    <option value="4+">4+</option>
                  </select>
                </div>
                <div className="mb-8 flex flex-col">
                  <label
                    htmlFor="howDidYouHear"
                    className="text-[#242426] tahoma text-sm font-normal mb-1"
                  >
                    Maximum Price:
                  </label>
                  <select
                    id="howDidYouHear"
                    name="howDidYouHear"
                    className="border-b border-[#E2E4E5] px-2 py-1"
                  >
                    <option value="" disabled selected>
                      --None--
                    </option>
                    {[...Array(24)].map((_, i) => {
                      const value = 25000 * (i + 1);
                      const display = `$${(value / 1000).toFixed(0)}k`;
                      return (
                        <option key={value} value={display}>
                          {display}
                        </option>
                      );
                    })}
                    <option value="$700k+">700k+</option>
                    <option value="$800k+">800k+</option>
                    <option value="$900k+">900k+</option>
                    <option value="$1M+">1M+</option>
                  </select>
                </div>
                <div className="flex flex-col">
                  <label
                    htmlFor="howDidYouHear"
                    className="text-[#242426] tahoma text-sm font-normal mb-1"
                  >
                    Are you pre-approved for a mortgage?
                  </label>
                  <select
                    id="howDidYouHear"
                    name="howDidYouHear"
                    className="border-b border-[#E2E4E5] px-2 py-1"
                  >
                    <option value="" disabled selected>
                      --None--
                    </option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                    <option value="in process">In Process</option>
                  </select>
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
      </div>
    </div>
  );
};

export default ContactForm;