"use client"
import React from "react"; // No need for useState or useEffect
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
  logo: ActionImage
  title: string;
  description: DescriptionType[];
}

interface DescriptionType {
  _key: string;
  children: Children[];
}

interface Children {
  text: string
}

const SkillFuturesBuild = () => {
  const [internshipBenefitData, setInternshipBenefitData] = useState<pageData>()

  const fetchActionData = useCallback(async () => {
    try {
      const response = await internshipPageService.fetchInternshipBenefits()
      if (!response.ok) throw new Error('Failed to fetch posts')
      const data = await response.json()
      setInternshipBenefitData(data)
    } catch (error) {
      console.error('Error fetching posts:', error)
    }
  }, [])

  useEffect(() => {
    fetchActionData()
  }, [fetchActionData])

  return (
    <div className="w-full relative lg:py-12 sm:py-5 py-5 lg:px-0 px-5">
      <div className="">
        <div className="container mx-auto ">
          <div className="grid lg:grid-cols-2 md:grid-cols-1 sm:grid-cols-1 grid-cols-1 justify-center xl:gap-10 lg:gap-10 md:gap-10 sm:gap-2 gap-2 xl:px-10 lg:px-10 md:px-10 sm:px-3 px-3">
            <div className="text-center">
              <h2 className="text-[#292F6C] text-center tahoma lg:text-[45] md:text-[45px] sm:text-[31px] text-[31px] font-bold">
                {internshipBenefitData?.title}
              </h2>
              <Image
                width={237}
                height={209}
                src={internshipBenefitData?.logo?.asset?.image_url || "/icon/VeteranPCS-logo_wht-outline.svg"}
                alt={internshipBenefitData?.logo?.alt || "check"}
                className="w-[237px] h-[209px] mx-auto"
              />
            </div>
            <div>
              <ul>
                {internshipBenefitData?.description.map((item) => (
                  <li
                    key={item._key}
                    className="text-[#000000] roboto lg:text-lg md:text-lg sm:text-sm text-sm font-medium list-disc"
                  >
                    {item.children[0].text}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SkillFuturesBuild;
