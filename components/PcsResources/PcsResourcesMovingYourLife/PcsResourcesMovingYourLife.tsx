import React from "react";
import "@/styles/globals.css";
import Image from "next/image";
import Link from "next/link";

const PcsResourcesMovingYourLife = () => {
  return (
    <div className="bg-[#E8E8E8] py-12 px-5">
      <div className="container mx-auto">
        <div>
          <h2 className="text-[#003486] tahoma lg:text-[43px] md:text-[43px] sm:text-[31px] text-[31px] font-bold">
            Moving your life resources
          </h2>
        </div>
        <div className="grid lg:grid-cols-3 md:grid-cols-2 sm:grid-cols-1 grid-cols-1 gap-16 mt-10">
          <div>
            <Image
              width={356}
              height={95}
              src="/assets/MovingLifeimg1.png"
              alt="check"
              className="w-[356px] h-[95px]"
            />
            <div className="mt-5">
              <Link
                href="https://stachd.com/"
                className="text-[#292F6C] poppins lg:text-[21px] md:text-[21px] sm:text-[17px] text-[17px] font-bold"
              >
                MILITARY SPOUSE CHAMBER OF COMMERCE
              </Link>
              <p className="text-[#000000] roboto lg:text-[18px] md:text-[18px] sm:text-[13px] text-[13px] font-light mt-1">
                active duty and veteran military spouse business owners tools
                and resources
              </p>
            </div>
          </div>
          <div>
            <Image
              width={356}
              height={78}
              src="/assets/VeteranOwnedBusiness_logo.png"
              alt="check"
              className="w-[356px] h-[78px]"
            />
            <div className="mt-5">
              <Link
                href="https://stachd.com/"
                className="text-[#292F6C] poppins lg:text-[21px] md:text-[21px] sm:text-[17px] text-[17px] font-bold"
              >
                BUSINESS DIRECTORY
              </Link>
              <p className="text-[#000000] roboto lg:text-[18px] md:text-[18px] sm:text-[13px] text-[13px] font-light mt-1">
                The leading free, comprehensive, user- friendly directory of
                businesses owned by military veterans
              </p>
            </div>
          </div>
          <div>
            <Image
              width={114}
              height={114}
              src="/assets/wilvets.png"
              alt="check"
              className="w-[114px] h-[114px]"
            />
            <div className="mt-5">
              <Link
                href="https://stachd.com/"
                className="text-[#292F6C] poppins lg:text-[21px] md:text-[21px] sm:text-[17px] text-[17px] font-bold"
              >
                Mil - Vets
              </Link>
              <p className="text-[#000000] roboto lg:text-[18px] md:text-[18px] sm:text-[13px] text-[13px] font-light mt-1">
                Offers military spouses and veteran- owned small businesses
              </p>
            </div>
          </div>
          <div>
            <Image
              width={289}
              height={83}
              src="/assets/SpouselyFlagLogo.png"
              alt="check"
              className="w-[289px] h-[83px]"
            />
            <div className="mt-5">
              <Link
                href="https://stachd.com/"
                className="text-[#292F6C] poppins lg:text-[21px] md:text-[21px] sm:text-[17px] text-[17px] font-bold"
              >
                SPOUSELY
              </Link>
              <p className="text-[#000000] roboto lg:text-[18px] md:text-[18px] sm:text-[13px] text-[13px] font-light mt-1">
                Goods from families who give. Shop small, big impact.
              </p>
            </div>
          </div>
          <div>
            <Image
              width={341}
              height={93}
              src="/assets/bunkerlabslogo.png"
              alt="check"
              className="w-[341px] h-[93px]"
            />
            <div className="mt-5">
              <Link
                href="https://stachd.com/"
                className="text-[#292F6C] poppins lg:text-[21px] md:text-[21px] sm:text-[17px] text-[17px] font-bold"
              >
                Bunker Labs
              </Link>
              <p className="text-[#000000] roboto lg:text-[18px] md:text-[18px] sm:text-[13px] text-[13px] font-light mt-1">
                It’s time to course correct.  Veteran entrepreneurship rates
                plummeted in the 20th century.
              </p>
            </div>
          </div>
          <div>
            <Image
              width={274}
              height={57}
              src="/assets/BoxOpsLogo.png"
              alt="check"
              className="w-[274px] h-[57px]"
            />
            <div className="mt-5">
              <Link
                href="https://stachd.com/"
                className="text-[#292F6C] poppins lg:text-[21px] md:text-[21px] sm:text-[17px] text-[17px] font-bold"
              >
                BoxOps
              </Link>
              <p className="text-[#000000] roboto lg:text-[18px] md:text-[18px] sm:text-[13px] text-[13px] font-light mt-1">
                Calculate the Basic Allowance for Housing (BAH) amount you will
                receive at your next duty station based on location, pay grade,
                and dependency status.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PcsResourcesMovingYourLife;
