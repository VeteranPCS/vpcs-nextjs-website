"use client"
import React from "react";
import "@/styles/globals.css";
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
  foreground_image?: ForegroundImage;
  header?: string;
  description?: string;
  buttonText?: string;
}

const HowVetPcsStarted = () => {
  const [pageData, SetPageData] = useState<PageData>({});

  const fetchOverviewData = useCallback(async () => {
    try {
      const response = await aboutService.fetchOverviewDetails('how_veternce_pcs_started')
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
    <div className="bg-[#EEEEEE] pt-14 pb-8 md:pb-0">
      <div>
        <div className="container mx-auto">
          <div className="lg:w-[700px] mx-auto px-12 md:px-0 pt-4 md:pt-0">
            <div>
              <Image
                width={700}
                height={523}
                src={pageData?.foreground_image?.asset?.image_url || "/assets/Aboutflight.png"}
                alt="hand"
                className="md:w-[700px] md:h-[523px] w-auto h-auto pb-6 md:pb-0"
              />
            </div>
            <div className="lg:mt-16 lg:mb-7">
              <h2 className="text-[#292F6C] text-center font-tahoma text-[32px] leading-[32px] font-bold md:pb-0 pb-5">
                {pageData?.header}
              </h2>
            </div>
            <div>
            {pageData?.description?.split("\n").map((paragraph, index) => (
              <p key={index} className="text-black tahoma text-lg font-normal mb-4">
                {paragraph.trim()}
              </p>
            ))}
            </div>
            <div className="flex justify-center">
              <Button buttonText={pageData.buttonText || "Default Button"} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HowVetPcsStarted;
