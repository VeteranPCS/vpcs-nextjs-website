"use client"
import "@/styles/globals.css";
import Image from "next/image";

const FamilyVideo = () => {

  return (
    <div className="w-full relative overflow-hidden">
      <div>
        <video
          loop
          autoPlay
          playsInline
          muted
          preload="auto"
          src="/assets/military-families.mp4"
          className="w-full"
        >
          <source type="video/mp4" src="/assets/military-families.mp4 " />
          <source type="video/webm" src="/assets/military-families.mp4" />
        </video>
      </div>
      <div className="container mx-auto overflow-hidden">
        <div className="absolute top-[50%] left-[50%] transform -translate-x-1/2 -translate-y-1/2 w-full">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center items-center baseline rounded-2xl p-0 sm:p-6 lg:space-y-10">
                <div className="flex justify-center mx-auto lg:w-[100px] lg:h-[100px] sm:w-[70px] sm:h-[70px] w-[25px] h-[25px]">
                  <Image
                    width={100}
                    height={100}
                    src="/icon/yourimpacthendwhhite.svg"
                    alt="impact_wearblue"
                    className="w-full h-full"
                  />
                </div>
                <div className="text-center lg:space-y-5">
                  <h2 className="text-white font-bold lg:text-4xl md:text-4xl text-base tahoma mt-5 mb-2">
                    $317,000+
                  </h2>
                  <p className="text-white font-normal lg:text-xl md:text-base sm:text-xs text-[10px] tahoma">
                    Savings Given Back
                  </p>
                </div>
              </div>

              <div className="text-center items-center baseline rounded-2xl p-0 sm:p-6 lg:space-y-10">
                <div className="flex justify-center mx-auto lg:w-[100px] lg:h-[100px] sm:w-[70px] sm:h-[70px] w-[25px] h-[25px]">
                  <Image
                    width={100}
                    height={100}
                    src="/icon/yourhome.svg"
                    alt="impact_wearblue"
                    className="w-full h-full"
                  />
                </div>
                <div className="text-center lg:space-y-5">
                  <h2 className="text-white font-bold lg:text-4xl md:text-4xl text-base tahoma mt-5 mb-2">
                    $113M+
                  </h2>
                  <p className="text-white font-normal lg:text-xl md:text-base sm:text-xs text-[10px] tahoma">
                    Real Estate Volume Sold
                  </p>
                </div>
              </div>

              <div className="text-center items-center baseline rounded-2xl p-0 sm:p-6 lg:space-y-10">
                <div className="flex justify-center mx-auto lg:w-[100px] lg:h-[100px] sm:w-[70px] sm:h-[70px] w-[25px] h-[25px]">
                  <Image
                    width={100}
                    height={100}
                    src="/icon/yourSymbol.svg"
                    alt="impact_wearblue"
                    className="w-full h-full"
                  />
                </div>
                <div className="text-center lg:space-y-5">
                  <h2 className="text-white font-bold lg:text-4xl md:text-4xl text-base tahoma mt-5 mb-2">
                    $33,000
                  </h2>
                  <p className="text-white font-normal lg:text-xl md:text-base sm:text-xs text-[10px] tahoma">
                    Donated to Military Foundations
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FamilyVideo;
