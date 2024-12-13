import Image from "next/image";
import React from "react";

const ContactForm = () => {
  return (
    <div className="md:py-12 py-4 md:px-0 px-5">
      <div className="md:w-[456px] mx-auto my-10">
        <div className="flex flex-col gap-8">
          <div className="md:text-left text-center">
            <h1 className="text-[#7E1618] tahoma lg:text-[32px] md:text-[32px] sm:text-[24px] text-[24px] font-bold leading-8">
              Profile info
            </h1>
            <p className="text-[#575F6E] roboto text-base font-black mt-3">
              This form generates an email connection between you and the agent,
              shows you used VeteranPCS, and qualifies you for the Bonus of
              $200-$4,000 at closing. 
            </p>
          </div>
          <div className="border rounded-lg border-[#E2E4E5] p-8">
            <div className="mb-8">
              <h3 className="text-[#000080] tahoma text-xl font-bold">
                Personal data
              </h3>
              <p className="text-[#575F6E] roboto text-sm font-light">
                No spam mail, no fees. <b>VeteranPCS is free to use.</b>
              </p>
            </div>
            <form action="">
              <div>
                <div className="mb-8 flex flex-col">
                  <label
                    htmlFor="firstName"
                    className="text-[#242426] tahoma text-sm font-normal mb-1"
                  >
                    Current Base/City
                  </label>
                  <input
                    className="border-b border-[#E2E4E5] px-2 py-1"
                    type="text"
                    id="firstName"
                    name="firstName"
                    placeholder="Alexander"
                  />
                </div>
                <div className="mb-8 flex flex-col">
                  <label
                    htmlFor="howDidYouHear"
                    className="text-[#242426] tahoma text-sm font-normal mb-1"
                  >
                    How did you hear about us?
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
                <div className="mb-8">
                  <h3 className="text-[#000080] tahoma text-xl font-bold">
                    Additional Comments
                  </h3>
                  <p className="text-[#575F6E] roboto text-sm font-light">
                    Have additional comments about your specific move? This is
                    not required.
                  </p>
                </div>
                <div className="text-center mx-auto px-7">
                  <div className="border-b border-[#E2E4E5] px-2 py-1">
                    We are moving but don’t have orders yet
                  </div>
                </div>
              </div>
            </form>
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
          <div className="flex md:justify-start justify-center">
            <button
              type="submit"
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
    </div>
  );
};

export default ContactForm;
