import Image from "next/image";
import React from "react";

const ContactForm = () => {
  return (
    <div className="md:py-12 py-4 md:px-0 px-5">
      <div className="md:w-[456px] mx-auto my-10">
        <div className="flex flex-col gap-8">
          <div className="md:text-left text-center">
            <h1 className="text-[#7E1618] tahoma lg:text-[32px] md:text-[32px] sm:text-[24px] text-[24px] font-bold leading-8">
              Want to share more?
            </h1>
            <p className="text-[#575F6E] roboto text-base font-black mt-3">
              We would love to hear from you.
            </p>
          </div>
          <div className="border rounded-lg border-[#E2E4E5] p-8">
            <div className="mb-8">
              <h3 className="text-[#7E1618] tahoma text-xl font-bold">
                Tell us about your upcoming move
              </h3>
              <p className="text-[#575F6E] roboto text-sm font-light">
                This section is optional
              </p>
            </div>
            <form action="">
              <div>
                <div className="mb-8 flex flex-col">
                  <label
                    htmlFor="howDidYouHear"
                    className="text-[#242426] tahoma text-sm font-normal mb-1"
                  >
                    Destination City
                  </label>
                  <select
                    id="howDidYouHear"
                    name="howDidYouHear"
                    className="border-b border-[#E2E4E5] px-2 py-1"
                  >
                    <option value="" disabled selected>
                      New York
                    </option>
                    <option value="friend">New York</option>
                    <option value="advertisement">New York</option>
                    <option value="socialMedia">New York</option>
                    <option value="searchEngine">New York</option>
                    <option value="other">New York</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="mb-8 flex flex-col">
                    <label
                      htmlFor="howDidYouHear"
                      className="text-[#242426] tahoma text-sm font-normal mb-1"
                    >
                      Destination City
                    </label>
                    <select
                      id="howDidYouHear"
                      name="howDidYouHear"
                      className="border-b border-[#E2E4E5] px-2 py-1"
                    >
                      <option value="" disabled selected>
                        NY
                      </option>
                      <option value="friend">NY</option>
                      <option value="advertisement">NY</option>
                      <option value="socialMedia">NY</option>
                      <option value="searchEngine">NY</option>
                      <option value="other">NY</option>
                    </select>
                  </div>
                  <div className="mb-8 flex flex-col">
                    <label
                      htmlFor="firstName"
                      className="text-[#242426] tahoma text-sm font-normal mb-1"
                    >
                      Base/City
                    </label>
                    <input
                      className="border-b border-[#E2E4E5] px-2 py-1"
                      type="text"
                      id="firstName"
                      name="firstName"
                      placeholder="Fort Drum "
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="mb-8 flex flex-col">
                    <label
                      htmlFor="howDidYouHear"
                      className="text-[#242426] tahoma text-sm font-normal mb-1"
                    >
                      Buying or Selling
                    </label>
                    <select
                      id="howDidYouHear"
                      name="howDidYouHear"
                      className="border-b border-[#E2E4E5] px-2 py-1"
                    >
                      <option value="" disabled selected>
                        Buying
                      </option>
                      <option value="friend">Buying</option>
                      <option value="advertisement">Buying</option>
                      <option value="socialMedia">Buying</option>
                      <option value="searchEngine">Buying</option>
                      <option value="other">Buying</option>
                    </select>
                  </div>
                  <div className="mb-8 flex flex-col">
                    <label
                      htmlFor="firstName"
                      className="text-[#242426] tahoma text-sm font-normal mb-1"
                    >
                      Timeframe
                    </label>
                    <input
                      className="border-b border-[#E2E4E5] px-2 py-1"
                      type="text"
                      id="firstName"
                      name="firstName"
                      placeholder="6 months"
                    />
                  </div>
                </div>
                <div className="mb-8 flex flex-col">
                  <label
                    htmlFor="howDidYouHear"
                    className="text-[#242426] tahoma text-sm font-normal mb-1"
                  >
                    Type of home
                  </label>
                  <select
                    id="howDidYouHear"
                    name="howDidYouHear"
                    className="border-b border-[#E2E4E5] px-2 py-1"
                  >
                    <option value="" disabled selected>
                      --None--
                    </option>
                    <option value="friend">Buying</option>
                    <option value="advertisement">Buying</option>
                    <option value="socialMedia">Buying</option>
                    <option value="searchEngine">Buying</option>
                    <option value="other">Buying</option>
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
                    <option value="friend">Buying</option>
                    <option value="advertisement">Buying</option>
                    <option value="socialMedia">Buying</option>
                    <option value="searchEngine">Buying</option>
                    <option value="other">Buying</option>
                  </select>
                </div>
              </div>
            </form>
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
      </div>
    </div>
  );
};

export default ContactForm;
