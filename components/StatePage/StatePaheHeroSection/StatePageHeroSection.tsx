import React from "react";
import "@/styles/globals.css";
import Image from "next/image";
import Link from "next/link";

const StatePageHeroSecondSection = () => {
  return (
    <div className=" py-12 px-5 bg-[#D9D9D9]">
      <div className="container mx-auto lg:pt-[180px] lg:pb-[50px] md:pt-[180px] md:pb-[50px] sm:pt-[180px] sm:pb-[50px] pt-[60px] pb-[30px]">
        <div className="grid lg:grid-cols-2 md:grid-cols-1 sm:grid-cols-1 grid-cols-1 items-start justify-between gap-4">
          <div>
            <div className="sm:text-left text-center">
              <h1 className="text-[#292F6C] tahoma lg:text-[60px] md:text-[60px] sm:text-[55px] text-[55px] font-bold lg:w-[200px] md:w-[200px] sm:w-full w-full leading-[58px]">
                South Carolina
              </h1>
              <p className="text-[#292F6C] tahoma lg:text-[40px] md:text-[35px] sm:text-[25px] text-[18px] font-normal">
                Real Estate Agents & Lenders
              </p>
            </div>
            <div className="flex flex-wrap justify-center sm:justify-start items-center gap-4 sm:mt-20 mt-10">
              <div>
                <Link
                  className="text-[#ffffff] tahoma text-sm font-normal bg-[#7E1618] rounded-[16px] px-8 py-5 text-center "
                  href="#"
                >
                  North Augusta Agents
                </Link>
              </div>
              <div className="md:ml-5 sm:ml-0 ml-0 mt-10 sm:mt-0">
                <Link
                  className="text-[#ffffff] tahoma text-sm font-normal bg-[#7E1618] rounded-[16px] px-8 py-5 text-center "
                  href="#"
                >
                  North Augusta Agents
                </Link>
              </div>
            </div>
            <div className="flex flex-wrap justify-center sm:justify-start items-center gap-4 mt-12">
              <div>
                <Link
                  className="text-[#ffffff] tahoma text-sm font-normal bg-[#7E1618] rounded-[16px] px-8 py-5 text-center "
                  href="#"
                >
                  North Augusta Agents
                </Link>
              </div>
              <div className="md:ml-5 sm:ml-0 ml-0 mt-10 sm:mt-0">
                <Link
                  className="text-[#ffffff] tahoma text-sm font-normal bg-[#7E1618] rounded-[16px] px-8 py-5 text-center "
                  href="#"
                >
                  North Augusta Agents
                </Link>
              </div>
            </div>
            <div className="flex flex-wrap justify-center sm:justify-start items-center gap-4 mt-12">
              <div>
                <Link
                  className="text-[#ffffff] tahoma text-sm font-normal bg-[#7E1618] rounded-[16px] px-8 py-5 text-center "
                  href="#"
                >
                  North Augusta Agents
                </Link>
              </div>
              <div className="md:ml-5 sm:ml-0 ml-0 mt-10 sm:mt-0">
                <Link
                  className="text-[#ffffff] tahoma text-sm font-normal bg-[#7E1618] rounded-[16px] px-8 py-5 text-center "
                  href="#"
                >
                  North Augusta Agents
                </Link>
              </div>
            </div>
          </div>
          <div>
            <Image
              src="/assets/South-Carolina-map.png"
              alt="Description of the image"
              width={1000}
              height={1000}
              className="w-auto h-auto object-cover"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatePageHeroSecondSection;
