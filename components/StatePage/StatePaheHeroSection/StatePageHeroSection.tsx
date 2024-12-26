import React from "react";
import "@/styles/globals.css";
import Image from "next/image";
import Link from "next/link";

interface ImageAsset {
  image_url: string;
}

interface CityImage {
  asset: ImageAsset;
  alt: string;
}

interface StatePageHeroSecondSectionProps {
  cityName: string;
  cityImage: CityImage;
  cityList: string[];
}

const StatePageHeroSecondSection = ({ cityName, cityImage, cityList }: StatePageHeroSecondSectionProps) => {

  const groupCitiesInPairs = (cities: string[]): string[][] => {
    const pairs: string[][] = [];
  
    for (let i = 0; i < cities.length; i += 2) {
      pairs.push(cities.slice(i, i + 2));
    }
  
    return pairs;
  };
  
  const cityNames = cityList // Extracting the city names from the object
  const cityPairs = groupCitiesInPairs(cityNames);
  
  return (
    <div className="py-12 px-5 bg-[#D9D9D9]">
      <div className="container mx-auto lg:pt-[180px] lg:pb-[50px] md:pt-[180px] md:pb-[50px] sm:pt-[180px] sm:pb-[50px] pt-[60px] pb-[30px]">
        <div className="grid lg:grid-cols-2 md:grid-cols-1 sm:grid-cols-1 grid-cols-1 items-start justify-between gap-4">
          <div>
            <div className="sm:text-left text-center">
              <h1 className="text-[#292F6C] tahoma lg:text-[60px] md:text-[60px] sm:text-[55px] text-[55px] font-bold lg:w-[200px] md:w-[200px] sm:w-full w-full leading-[58px]">
                {cityName}
              </h1>
              <p className="text-[#292F6C] tahoma lg:text-[40px] md:text-[35px] sm:text-[25px] text-[18px] font-normal">
                Real Estate Agents & Lenders
              </p>
            </div>
            {cityPairs.map((pair, index) => (
              <div
                key={index}
                className={`flex flex-wrap justify-center sm:justify-start items-center gap-4 ${index > 0 ? "mt-12" : "sm:mt-20 mt-10"}`}
              >
                {pair.map((city, cityIndex) => (
                  <div key={cityIndex} className={cityIndex > 0 ? "md:ml-5 sm:ml-0 ml-0" : ""}>
                    <Link
                      className="text-[#ffffff] tahoma text-sm font-normal bg-[#7E1618] rounded-[16px] px-8 py-5 text-center"
                      href="#"
                    >
                      {city} Agents
                    </Link>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div>
            <Image
              src={cityImage?.asset?.image_url || "/assets/South-Carolina-map.png"}
              alt={cityImage?.alt || "Description of the image"}
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
