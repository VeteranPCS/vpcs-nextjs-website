import React from "react";
import "@/app/globals.css";
import Image from "next/image";
import Button from "@/components/common/Button";
import CitySelection from "./CitySelection";
import Link from "next/link";
import { urlForImage } from "@/sanity/lib/image";
import { Image as SanityImage } from 'sanity';

interface StateImage extends SanityImage {
  alt: string;
}

interface StatePageHeroSectionProps {
  stateName: string;
  stateImage: StateImage;
  cityList: string[];
}

const StatePageHeroSection = ({
  stateName,
  stateImage,
  cityList,
}: StatePageHeroSectionProps) => {
  const imageUrl = stateImage ? urlForImage(stateImage) : "/assets/South-Carolina-map.png";

  return (
    <div className="py-12 px-5 bg-[#BABABA]">
      <div className="container mx-auto md:pt-20 lg:pb-12 md:pb-12 sm:pb-12 pt-12 pb-4">
        <div className="grid lg:grid-cols-2 md:grid-cols-1 sm:grid-cols-1 grid-cols-1 items-center justify-between gap-4">
          <div>
            <div className="sm:text-left text-center">
              <h1 className="text-[#292F6C] tahoma lg:text-[78px] md:text-[66px] text-[40px] font-bold md:w-[300px] sm:w-full w-full">
                {stateName}
              </h1>
              <p className="text-[#292F6C] tahoma lg:text-[40px] md:text-[35px] sm:text-[25px] text-[18px] font-normal mt-5">
                Real Estate Agents & VA Loan Lenders
              </p>
            </div>
            <div className="relative md:my-0 sm:mt-5 mt-5 w-full inline-grid justify-center md:justify-start md:mt-10">
              <CitySelection cityList={cityList} />
              <div className="mt-6">
                <p className="text-[#292F6C]">Don&apos;t want to browse?</p>
                <Link href="/contact-agent">
                  <Button buttonText="Find an agent for me" />
                </Link>
              </div>
            </div>
          </div>
          <div className="md:mt-0 mt-10">
            <Image
              src={imageUrl}
              alt={stateImage?.alt || `Map of ${stateName}`}
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
