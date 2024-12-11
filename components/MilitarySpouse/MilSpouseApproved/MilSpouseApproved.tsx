"use client";
import "@/styles/globals.css";
import Image from "next/image";
import SliderValueLabel from "@/components/MilitarySpouse/SquaredAway/SquaredAwaySlider";

const MilitarySpouseApproved = () => {
  return (
    <div className="w-full py-12 lg:px-0 px-5">
      <div className="container mx-auto">
        <div
          className="grid lg:grid-cols-2 md:grid-cols-1 sm:grid-cols-1
         grid-cols-1 justify-center xl:gap-10 lg:gap-10 md:gap-10 sm:gap-2 gap-2 xl:px-10 lg:px-10 md:px-10 sm:px-3 px-3 lg:py-12"
        >
          <div className="flex justify-center">
            <Image
              src="/assets/milspouseapproved.png"
              alt="approved"
              width={1000}
              height={1000}
              className="w-[613px] h-[613px]"
            />
          </div>
          <div>
            <div>
              <h2 className="text-[#292F6C] tahoma lg:text-[63px] md:text-[53px] sm:text-[43px] text-[32px] font-bold">
                Military Spouse Approved Resources
              </h2>
              <p className="text-[#292F6C] tahoma lg:text-[30px] md:text-[30px] sm:text-[20px] text-[20px] font-normal">
                support mil spouse & veteran owned businesses
              </p>
            </div>
            <div className="lg:ml-10 my-7">
              <ul>
                <li className="text-[#58595D] roboto lg:text-[20px] md:text-[18px] sm:text-[16px] text-[14px] font-medium list-disc mb-2 lg:w-[500px]">
                  Moving can be a huge stressor. Check out these helpful
                  resources.
                </li>
              </ul>
            </div>
            <div>
              <SliderValueLabel />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MilitarySpouseApproved;
