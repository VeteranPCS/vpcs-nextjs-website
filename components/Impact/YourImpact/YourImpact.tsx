import React from "react";
import "@/app/globals.css";
import classes from "./YourImpact.module.css";
import Image from "next/image";
import { getAllImpactMetrics } from "@/services/salesforceImpactService";

const HeroSec = async () => {
  const metrics = await getAllImpactMetrics();

  return (
    <div>
      <div className={classes.yourimpactsectioncontainer}>
        <div className="container mx-auto md:px-9 sm:px-0">
          <div className="text-center">
            <p className="text-white font-bold lg:text-[48px] md:text-[40px] text-[32px] poppins leading-[1.3] tahoma">
              Your Impact
            </p>
            <h1 className="text-[18px] font-normal text-white poppins mb-10 mt-3 tahoma">
              With your support we have been able to Impact the military community in amazing ways
            </h1>
          </div>
          <div className="grid lg:grid-cols-3 md:grid-cols-2 grid-cols-1 items-start justify-between gap-3">
            <div className="text-center md:block flex items-center mt-3 md:bg-transparent bg-[#7E1618] rounded-2xl p-6">
              <div className="md:flex md:justify-center md:mx-auto w-[70px] h-[70px]">
                <Image
                  width={1000}
                  height={1000}
                  src="/icon/yourimpacthendwhhite.svg"
                  alt="impact_wearblue"
                  className="md:w-full md:h-full w-14 h-14"
                />
              </div>
              <div className="md:text-center text-left md:pl-0 pl-3">
                <h2 className="text-white font-bold md:text-[42px] text-[35px] tahoma md:mt-5 mb-2">
                  {metrics.cashBackAmount}
                </h2>
                <p className="text-white font-normal md:text-[23px] text-[14px] tahoma">
                  Savings Given Back
                </p>
              </div>
            </div>
            <div className="text-center md:block flex items-center mt-3 md:bg-transparent bg-[#7E1618] rounded-2xl p-6">
              <div className="md:flex md:justify-center md:mx-auto w-[70px] h-[70px]">
                <Image
                  width={1000}
                  height={1000}
                  src="/icon/yourhome.svg"
                  alt="impact_wearblue"
                  className="md:w-full md:h-full w-14 h-14 object-contain"
                />
              </div>
              <div className="md:text-center text-left md:pl-0 pl-3">
                <h2 className="text-white font-bold md:text-[42px] text-[35px] tahoma md:mt-5 mb-2">
                  {metrics.totalVolumeSold}
                </h2>
                <p className="text-white font-normal md:text-[23px] text-[14px] tahoma">
                  Real Estate Volume Sold
                </p>
              </div>
            </div>
            <div className="text-center md:block flex items-center mt-3 md:bg-transparent bg-[#7E1618] rounded-2xl p-6">
              <div className="md:flex md:justify-center md:mx-auto w-[70px] h-[70px]">
                <Image
                  width={1000}
                  height={1000}
                  src="/icon/yourSymbol.svg"
                  alt="impact_wearblue"
                  className="md:w-full md:h-full w-14 h-14"
                />
              </div>
              <div className="md:text-center text-left md:pl-0 pl-3">
                <h2 className="text-white font-bold md:text-[42px] text-[35px] tahoma md:mt-5 mb-2">
                  {metrics.charityAmount}
                </h2>
                <p className="text-white font-normal md:text-[23px] text-[14px] tahoma">
                  Donated to Military Foundations
                </p>
              </div>
            </div>
            <div className="text-center md:block flex items-center mt-3 md:bg-transparent bg-[#7E1618] rounded-2xl p-6">
              <div className="md:flex md:justify-center md:mx-auto w-[70px] h-[70px]">
                <Image
                  width={1000}
                  height={1000}
                  src="/icon/yourSymbolcontact.svg"
                  alt="impact_wearblue"
                  className="md:w-full md:h-full w-14 h-14"
                />
              </div>
              <div className="md:text-center text-left md:pl-0 pl-3">
                <h2 className="text-white font-bold md:text-[42px] text-[35px] tahoma md:mt-5 mb-2">
                  370+
                </h2>
                <p className="text-white font-normal md:text-[23px] text-[14px] tahoma">
                  Veterans & Military Spouses Listed
                </p>
              </div>
            </div>
            <div className="text-center md:block flex items-center mt-3 md:bg-transparent bg-[#7E1618] rounded-2xl p-6">
              <div className="md:flex md:justify-center md:mx-auto w-[70px] h-[70px]">
                <Image
                  width={1000}
                  height={1000}
                  src="/icon/va-loans-used.svg"
                  alt="impact_wearblue"
                  className="md:w-full md:h-full w-14 h-14"
                />
              </div>
              <div className="md:text-center text-left md:pl-0 pl-3">
                <h2 className="text-white font-bold md:text-[42px] text-[35px] tahoma md:mt-5 mb-2">
                  250+
                </h2>
                <p className="text-white font-normal md:text-[23px] text-[14px] tahoma">
                  VA Loans Used
                </p>
              </div>
            </div>
            <div className="text-center md:block flex items-center mt-3 md:bg-transparent bg-[#7E1618] rounded-2xl p-6">
              <div className="md:flex md:justify-center md:mx-auto w-[70px] h-[70px]">
                <Image
                  width={1000}
                  height={1000}
                  src="/icon/yoursymbolmeet.svg"
                  alt="impact_wearblue"
                  className="md:w-full md:h-full w-14 h-14"
                />
              </div>
              <div className="md:text-center text-left md:pl-0 pl-3">
                <h2 className="text-white font-bold md:text-[42px] text-[35px] tahoma md:mt-5 mb-2">
                  30+
                </h2>
                <p className="text-white font-normal md:text-[23px] text-[14px] tahoma">
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
