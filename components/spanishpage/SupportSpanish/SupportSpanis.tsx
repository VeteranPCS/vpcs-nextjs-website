"use client";
import React from "react";
import "@/styles/globals.css";
import Button from "@/components/common/Button";
import Image from "next/image";
import { useState, useEffect, useCallback } from "react";
import aboutService from "@/services/aboutService";
import { useRouter } from "next/navigation";
interface ImageAsset {
  image_url?: string;
}

interface ForegroundImage {
  asset?: ImageAsset;
}

interface PageData {
  _id: string;
  image?: ForegroundImage;
  header_1?: string;
  header_2?: string;
  description_1?: string;
  description_2?: string;
  buttonText_1: string;
  buttonText_2: string;
  name?: string;
  designation?: string;
}

const SupportSpanish = () => {
  const router = useRouter();

  // Function to handle button click
  const handleContactButtonClick = () => {
    router.push("/contact"); // Navigate to the "stories" page
  };
  const handleImpactButtonClick = () => {
    router.push("/impact"); // Navigate to the "stories" page
  };
  const [pageData, SetPageData] = useState<PageData>({} as PageData);
  const [isLoading, setIsLoading] = useState(true);

  const fetchOverviewData = useCallback(async () => {
    try {
      const response = await aboutService.fetchSupportComponent()
      if (!response.ok) throw new Error('Failed to fetch posts')
      const data = await response.json()
      SetPageData(data)
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching posts:', error)
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOverviewData();
  }, [fetchOverviewData]);

  return (
    <div>
      {/* {isLoading ? (
        <Loader /> // Show the loader while data is loading
      ) : ( */}
        <div className="w-full lg:py-10 md:py-10 sm:py-10 py-10 px-9 sm:px-0">
          <div>
            <div className="container mx-auto w-full">
              <div
                className="px-4 bg-[#ffffff] mx-auto text-center"
                data-aos="fade-right"
                data-aos-duration="1000"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 justify-between items-start mt-10">
                  <div className="lg:text-left sm:text-center text-left flex flex-col gap-4 justify-between">
                    <div>
                      <h2 className="text-[#292F6C] font-bold xl:text-[42px] lg:text-[40px] sm:text-[42px] text-[45px] leading-[54px] tahoma">
                        {pageData?.header_1}
                      </h2>
                    </div>
                    <div>
                      <p className="text-[#161C2Db3] text-[20px] font-normal leading-[39px] tahoma">
                        {pageData?.description_1}
                      </p>
                    </div>
                    <div className="flex justify-start">
                      <Button buttonText={pageData?.buttonText_1} />
                    </div>
                  </div>
                  <div>
                    <div className="flex gap-4 items-center">
                      <Image
                        width={1000}
                        height={1000}
                        className="w-auto h-auto"
                        src={pageData?.image?.asset?.image_url || "/assets/military-image-2.png"}
                        alt="Move in bonus"
                      />
                    </div>
                  </div>
                  <div className="lg:text-left sm:text-left text-left flex flex-col sm:gap-7 gap-4 justify-between lg:ml-5 md:ml-5 sm:ml-0 ml-0">
                    <div>
                      <h2 className="text-[#292F6C] font-bold lg:text-[42px] sm:text-[42px] text-[42px] tahoma lg:w-[200px] leading-[52px]">
                        {pageData?.header_2}
                      </h2>
                    </div>
                    <div>
                      <p className="text-[#161C2Db3] text-[20px] font-normal leading-[38px] tahoma">
                        {pageData?.description_2}
                      </p>
                    </div>
                    <div className="flex lg:justify-start md:justify-start sm:justify-start justify-start items-center">
                      <Button buttonText={pageData?.buttonText_2} onClick={handleImpactButtonClick}/>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      {/* )} */}
    </div>

  );
};

export default SupportSpanish;
