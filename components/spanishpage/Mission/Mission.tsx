"use client"
import React from "react"; // No need for useState or useEffect
import "@/styles/globals.css";
import "@/styles/globals.css";
import classes from "./Mission.module.css";
import Button from "@/components/common/Button";
import Image from "next/image";
import { useState, useEffect, useCallback } from "react"
import aboutService from "@/services/aboutService";

interface ImageAsset {
  image_url?: string;
}

interface ForegroundImage {
  asset?: ImageAsset;
}

interface PageData {
  _id: string;
  foreground_image?: ForegroundImage;
  header?: string;
  description?: string;
  buttonText: string;
  name?: string;
  designation?: string;
}

const Mission = () => {
  const [pageData, SetPageData] = useState<PageData>({} as PageData);

  const fetchOverviewData = useCallback(async () => {
    try {
      const response = await aboutService.fetchOverviewDetails('move_with_a_mission')
      if (!response.ok) throw new Error('Failed to fetch posts')
      const data = await response.json()
      SetPageData(data)
    } catch (error) {
      console.error('Error fetching posts:', error)
    }
  }, [])

  useEffect(() => {
    fetchOverviewData()
  }, [fetchOverviewData])

  return (
    <div className="container mx-auto w-full lg:py-16 md:py-16 sm:py-16 py-0">
      <div className={classes.missioncontainer}>
        <div
          className="items-center grid lg:grid-cols-2 md:grid-cols-1 sm:grid-cols-1
         grid-cols-1 justify-center xl:gap-10 lg:gap-10 md:gap-10 sm:gap-2 gap-2 xl:px-10 lg:px-10 md:px-10 sm:px-3 px-3 lg:py-12"
        >
          <div className="flex sm:justify-end justify-center">
            <Image
              width={1000}
              height={1000}
              src={pageData?.foreground_image?.asset?.image_url || "/assets/Mission.png"}
              className="lg:w-[552px] lg:h-[552px] md:w-[552px] md:h-[552px] sm:w-[326px] sm:h-[326px] w-[326px] h-[326px]"
              alt="Description of the image"
            />
          </div>
          <div className="text-left">
            <div>
              <h1 className="text-white poppins lg:text-[31px] md:text-[31px] sm:text-[31px] text-[31px] font-bold mt-5 lg:text-left md:text-left sm:text-center text-left">
                {pageData?.header}
              </h1>
              <p className="text-white lg:text-[20px] md:text-[19px] sm:text-[16px] text-[16px] font-normal leading-[30px] mt-4 lg:text-left md:text-left sm:text-center text-left tahoma">
                {pageData?.description}
              </p>
            </div>
            <div className="flex lg:justify-start md:justify-start sm:justify-center justify-start items-center mt-2">
              <Button buttonText={pageData?.buttonText} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Mission;
