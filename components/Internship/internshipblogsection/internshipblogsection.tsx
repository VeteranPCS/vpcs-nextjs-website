"use client"
import React from "react";
import "@/styles/globals.css";
import Image from "next/image";
import { useState, useEffect, useCallback } from "react";
import internshipPageService from "@/services/internshipPageService";

interface ImageAsset {
  image_url: string;
}
interface ActionImage {
  asset: ImageAsset;
  alt: string
}
interface pageData {
  _id: string;
  action_image: ActionImage
  title: string;
  description: string;
}

const PcsResourcesCalculators = () => {
  const [internshipActionData, setInternshipActionData] = useState<pageData[]>([])

  const fetchActionData = useCallback(async () => {
    try {
      const response = await internshipPageService.fetchActionItem()
      if (!response.ok) throw new Error('Failed to fetch posts')
      const data = await response.json()
      setInternshipActionData(data)
    } catch (error) {
      console.error('Error fetching posts:', error)
    }
  }, [])

  useEffect(() => {
    fetchActionData()
  }, [fetchActionData])

  return (
    <div className="bg-[#E8E8E8] py-12 px-5">
      <div className="container mx-auto">
        <div className="grid lg:grid-cols-3 md:grid-cols-2 sm:grid-cols-1 grid-cols-1 gap-16 mt-10">
          {internshipActionData.map((data) => (
            <div key={data._id}>
              <div>
                <Image
                  width={1000}
                  height={237}
                  src={data?.action_image?.asset?.image_url || "/assets/successful-team1.png"} 
                  alt={data?.action_image?.alt || "check"} 
                  className="w-full lg:h-[356px] h-auto"
                />
                <div className="mt-5">
                  <h3 className="text-[#003486] poppins lg:text-[23px] md:text-[23px] sm:text-[17px] text-[17px] font-medium">
                    {data?.title}
                  </h3>
                  <p className="text-[#000000] roboto lg:text-[18px] md:text-[18px] sm:text-[13px] text-[13px] font-light mt-1">
                    {/* Utilize our recommended moving calculator to estimate the cost
                    of your move. **Not available for overseas moves** */}
                    {data?.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PcsResourcesCalculators;
