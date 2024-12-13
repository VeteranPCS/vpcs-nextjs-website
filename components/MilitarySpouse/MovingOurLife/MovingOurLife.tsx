"use client";
import "@/styles/globals.css";
import Image from "next/image";

const MovingOurLife = () => {
  return (
    <div className="w-full py-12 lg:px-0 px-5">
      <div className="container mx-auto">
        <div>
          <h1 className="text-[#292F6C] text-center tahoma lg:text-[43px] md:text-[30px] sm:text-[30px] text-[30px] leading-[32px] md:leading-normal mb-10 md:mb-0 font-bold">
            Moving Your Life
          </h1>
        </div>
        <div
          className="grid lg:grid-cols-3 md:grid-cols-2 sm:grid-cols-1
         grid-cols-1 justify-center xl:gap-10 lg:gap-10 md:gap-10 sm:gap-2 gap-2 xl:px-10 lg:px-10 md:px-10 sm:px-3 px-3 lg:py-12"
        >
          <div>
            <div className="md:h-[115px] h-auto">
              <Image
                src="/assets/BoxOps-Logo.png"
                width={1000}
                height={1000}
                alt="Description of the image"
                className="w-[300px] h-auto object-cover"
              />
            </div>
            <div>
              <p className="text-[#000000] roboto lg:text-lg md:text-lg sm:text-sm text-sm font-light md:pt-5 pt-4 mb-5 md:mb-0">
                Color Coded Moving Labels and Moving Box Organization. BoxOps
              </p>
            </div>
          </div>
          <div>
            <div className="md:h-[115px] h-auto">
              <Image
                src="/assets/militaryonesource.png"
                width={1000}
                height={1000}
                alt="Description of the image"
                className="w-[300px] h-auto  object-cover"
              />
            </div>
            <div>
              <p className="text-[#000000] roboto lg:text-lg md:text-lg sm:text-sm text-sm font-light md:pt-5 pt-4 mb-5 md:mb-0">
                Sponsorship can help service members and their families settle
                in quicker. Sponsors are assigned through your unit but if you
                need assistance, or haven’t been assigned a sponsor. Military
                One Source 
              </p>
            </div>
          </div>
          <div>
            <div className="md:h-[115px] h-auto">
              <Image
                src="/assets/porch-logo.png"
                width={1000}
                height={1000}
                alt="Description of the image"
                className="w-[300px] h-auto  object-cover"
              />
            </div>
            <div>
              <p className="text-[#000000] roboto lg:text-lg md:text-lg sm:text-sm text-sm font-light md:pt-5 pt-4 mb-5 md:mb-0">
                Moving, improving, and everything in between. Porch makes
                moving, insurance, and improving your home simple. Porch
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MovingOurLife;
