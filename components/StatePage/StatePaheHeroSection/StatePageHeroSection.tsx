import React from "react";
import "@/styles/globals.css";
import Image from "next/image";
import Button from "@/components/common/Button";
import CitySelection from "./CitySelection";
import Link from "next/link";
interface ImageAsset {
  image_url: string;
}

interface StateImage {
  asset: ImageAsset;
  alt: string;
}

interface StatePageHeroSectionProps {
  stateName: string;
  stateImage: StateImage;
  cityList: string[];
}

const StatePageHeroSection = ({
  stateName: cityName,
  stateImage: cityImage,
  cityList,
}: StatePageHeroSectionProps) => {

  return (
    <div className="py-12 px-5 bg-[#BABABA]">
      <div className="container mx-auto lg:pt-[180px] lg:pb-[50px] md:pt-[180px] md:pb-[50px] sm:pt-[180px] sm:pb-[50px] pt-[60px] pb-[30px]">
        <div className="grid lg:grid-cols-2 md:grid-cols-1 sm:grid-cols-1 grid-cols-1 items-center justify-between gap-4">
          <div>
            <div className="sm:text-left text-center">
              <h1 className="text-[#292F6C] tahoma lg:text-[78px] md:text-[66px] text-[40px] font-bold md:w-[300px] sm:w-full w-full">
                {cityName}
              </h1>
              <p className="text-[#292F6C] tahoma lg:text-[40px] md:text-[35px] sm:text-[25px] text-[18px] font-normal mt-5">
                Real Estate Agents & VA Loan Lenders
              </p>
            </div>
            <div className="relative md:my-0 sm:mt-5 mt-5 w-full inline-grid justify-center md:justify-start md:mt-10">
              <CitySelection cityList={cityList} />
              <Link href="/contact-agent">
                <Button buttonText="Don’t want to browse? Find an agent for me" />
              </Link>
            </div>
          </div>
          <div className="md:mt-0 mt-10">
            <Image
              src={
                cityImage?.asset?.image_url || "/assets/South-Carolina-map.png"
              }
              alt={cityImage?.alt || "Description of the image"}
              width={1000}
              height={1000}
              className="w-full h-full object-cover"
              loading="eager"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatePageHeroSection;
