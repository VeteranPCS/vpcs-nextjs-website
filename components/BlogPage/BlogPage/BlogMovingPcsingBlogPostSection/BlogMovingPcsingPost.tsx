import React from "react";
import "@/styles/globals.css";
import Image from "next/image";

const StatePageHeroSecondSection = () => {
  return (
    <div className="pt-12 md:px-0 px-5">
      <div className="container mx-auto">
        <div>
          <div className="w-full">
            <Image
              src="/assets/BlogpostImage.png"
              alt="Description of the image"
              width={310}
              height={280}
              className="w-full h-[280px]"
            />
            <div className="p-5 bg-[#FFFFFF]">
              <p className="text-[#6C757D] lora text-sm font-normal">
                08.08.2021
              </p>
              <h3 className="text-[#495057] tahoma text-lg font-bold my-4">
                Dream destinations to visit this year in Paris
              </h3>
              <p className="text-[#6C757D] roboto text-sm font-normal ">
                Progressively incentivize cooperative systems through
                technically sound functionalities. The credibly productivate
                seamless data.
              </p>
              <p className="bg-[#E5E5E5] p-[1px] w-full mt-5"></p>
              <div className="mt-5">
                <div className="flex items-center gap-4">
                    <Image
                      width={100}
                      height={100}
                      src="/assets/bloguser.png"
                      alt="check"
                      className="w-12 h-12"
                    />
                  <div>
                    <h6 className="text-[#343A40] tahoma text-sm font-bold">By Jennifer Lawrence</h6>
                    <p className="text-[#495057] tahoma text-sm font-normal">Military affiliation</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
  );
};

export default StatePageHeroSecondSection;
