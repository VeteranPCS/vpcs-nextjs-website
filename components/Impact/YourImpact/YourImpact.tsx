import React from "react";
import "@/styles/globals.css";
import classes from "./YourImpact.module.css";
import Image from "next/image";

const HeroSec = () => {
  return (
    <div>
      <div className={classes.yourimpactsectioncontainer}>
        <div className="container mx-auto md:px-9 sm:px-0">
          <div className="text-center">
            <p className="text-white font-bold lg:text-[48px] md:text-[40px] sm:text-[32px] text-[32px] poppins leading-[1.3] tahoma">
              Your Impact
            </p>
            <h1 className="lg:text-[18px] md:text-[18px] sm:text-[18px] text-[18px] font-normal text-white poppins mb-10 mt-3 tahoma">
              With your support we have been able to aid the military community
              in amazing ways
            </h1>
          </div>
          <div className="grid lg:grid-cols-3 md:grid-cols-2 sm:grid-cols-1 grid-cols-1 items-start justify-between sm:gap-3 gap-3">
            <div className="text-center md:block sm:flex flex sm:items-center items-center lg:mt-3 md:mt-3 sm:mt-3 mt-3 md:bg-transparent sm:bg-[#7E1618] bg-[#7E1618] sm:rounded-2xl rounded-2xl p-6 sm:p-6">
              <div className="md:flex md:justify-center md:mx-auto w-[70px] h-[70px]">
                <Image
                  width={1000}
                  height={1000}
                  src="/icon/yourimpacthendwhhite.svg"
                  alt="impact_wearblue"
                  className="md:w-full md:h-full sm:w-14 sm:h-14 w-14 h-14"
                />
              </div>
              <div className="md:text-center sm:text-left text-left md:pl-0 sm:pl-3 pl-3">
                <h2 className="text-white font-bold md:text-[42px] sm:text-[35px] text-[35px] tahoma md:mt-5 mb-2">
                  $317,000+
                </h2>
                <p className="text-white font-normal md:text-[23px] sm:text-[13px] text-[13px] tahoma">
                  Savings Given Back
                </p>
              </div>
            </div>
            <div className="text-center md:block sm:flex flex sm:items-center items-center lg:mt-3 md:mt-3 sm:mt-3 mt-3 md:bg-transparent sm:bg-[#7E1618] bg-[#7E1618] sm:rounded-2xl rounded-2xl p-6 sm:p-6">
              <div className="md:flex md:justify-center md:mx-auto w-[70px] h-[70px]">
                <Image
                  width={1000}
                  height={1000}
                  src="/icon/yourhome.svg"
                  alt="impact_wearblue"
                  className="md:w-full md:h-full sm:w-14 sm:h-14 w-14 h-14"
                />
              </div>
              <div className="md:text-center sm:text-left text-left md:pl-0 sm:pl-3 pl-3">
                <h2 className="text-white font-bold md:text-[42px] sm:text-[35px] text-[35px] tahoma md:mt-5 mb-2">
                  $113 Million
                </h2>
                <p className="text-white font-normal md:text-[23px] sm:text-[13px] text-[13px] tahoma">
                  Real Estate Volume Sold
                </p>
              </div>
            </div>
            <div className="text-center md:block sm:flex flex sm:items-center items-center lg:mt-3 md:mt-3 sm:mt-3 mt-3 md:bg-transparent sm:bg-[#7E1618] bg-[#7E1618] sm:rounded-2xl rounded-2xl p-6 sm:p-6">
              <div className="md:flex md:justify-center md:mx-auto w-[70px] h-[70px]">
                <Image
                  width={1000}
                  height={1000}
                  src="/icon/yourSymbol.svg"
                  alt="impact_wearblue"
                  className="md:w-full md:h-full sm:w-14 sm:h-14 w-14 h-14"
                />
              </div>
              <div className="md:text-center sm:text-left text-left md:pl-0 sm:pl-3 pl-3">
                <h2 className="text-white font-bold md:text-[42px] sm:text-[35px] text-[35px] tahoma md:mt-5 mb-2">
                  $33,000
                </h2>
                <p className="text-white font-normal md:text-[23px] sm:text-[13px] text-[13px] tahoma">
                  Donated to Military Foundations
                </p>
              </div>
            </div>
            <div className="text-center md:block sm:flex flex sm:items-center items-center lg:mt-3 md:mt-3 sm:mt-3 mt-3 md:bg-transparent sm:bg-[#7E1618] bg-[#7E1618] sm:rounded-2xl rounded-2xl p-6 sm:p-6">
              <div className="md:flex md:justify-center md:mx-auto w-[70px] h-[70px]">
                <Image
                  width={1000}
                  height={1000}
                  src="/icon/yourSymbolcontact.svg"
                  alt="impact_wearblue"
                  className="md:w-full md:h-full sm:w-14 sm:h-14 w-14 h-14"
                />
              </div>
              <div className="md:text-center sm:text-left text-left md:pl-0 sm:pl-3 pl-3">
                <h2 className="text-white font-bold md:text-[42px] sm:text-[35px] text-[35px] tahoma md:mt-5 mb-2">
                  340+
                </h2>
                <p className="text-white font-normal md:text-[23px] sm:text-[13px] text-[13px] tahoma">
                  Veterans & Military Spouses Listed
                </p>
              </div>
            </div>
            <div className="text-center md:block sm:flex flex sm:items-center items-center lg:mt-3 md:mt-3 sm:mt-3 mt-3 md:bg-transparent sm:bg-[#7E1618] bg-[#7E1618] sm:rounded-2xl rounded-2xl p-6 sm:p-6">
              <div className="md:flex md:justify-center md:mx-auto w-[70px] h-[70px]">
                <Image
                  width={1000}
                  height={1000}
                  src="/icon/va-loans-used.svg"
                  alt="impact_wearblue"
                  className="md:w-full md:h-full sm:w-14 sm:h-14 w-14 h-14"
                />
              </div>
              <div className="md:text-center sm:text-left text-left md:pl-0 sm:pl-3 pl-3">
                <h2 className="text-white font-bold md:text-[42px] sm:text-[35px] text-[35px] tahoma md:mt-5 mb-2">
                  250+
                </h2>
                <p className="text-white font-normal md:text-[23px] sm:text-[13px] text-[13px] tahoma">
                  VA Loans Used
                </p>
              </div>
            </div>
            <div className="text-center md:block sm:flex flex sm:items-center items-center lg:mt-3 md:mt-3 sm:mt-3 mt-3 md:bg-transparent sm:bg-[#7E1618] bg-[#7E1618] sm:rounded-2xl rounded-2xl p-6 sm:p-6">
              <div className="md:flex md:justify-center md:mx-auto w-[70px] h-[70px]">
                <Image
                  width={1000}
                  height={1000}
                  src="/icon/yoursymbolmeet.svg"
                  alt="impact_wearblue"
                  className="md:w-full md:h-full sm:w-14 sm:h-14 w-14 h-14"
                />
              </div>
              <div className="md:text-center sm:text-left text-left md:pl-0 sm:pl-3 pl-3">
                <h2 className="text-white font-bold md:text-[42px] sm:text-[35px] text-[35px] tahoma md:mt-5 mb-2">
                  30+
                </h2>
                <p className="text-white font-normal md:text-[23px] sm:text-[13px] text-[13px] tahoma">
                  Connected Internships
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroSec;
