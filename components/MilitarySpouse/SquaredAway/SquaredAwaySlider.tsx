"use client";
import React, { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { MilitarySpouseApprovedCompaniesProps } from '@/services/militarySpouseService';
import militarySpouseService from "@/services/militarySpouseService";

const Slider = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [sliderData, setSliderData] = useState<MilitarySpouseApprovedCompaniesProps[]>([]);

  const handleSlideClick = (index: number) => {
    setActiveIndex(index);
  };

  const fetchMilitarySpouseApprovedCompanies = useCallback(async () => {
    try {
      const response = await militarySpouseService.fetchMilitarySpouseApprovedCompanies();
      setSliderData(response);
    } catch (error) {
      console.error("Error fetching Military Spouse Approved Companies", error);
    }
  }, [])

  useEffect(() => {
    fetchMilitarySpouseApprovedCompanies()
  }, [fetchMilitarySpouseApprovedCompanies])

  return (
    <div className="w-full flex overflow-x-auto">
      {sliderData.map((slide, index) => (
        <div
          key={slide._id}
          className={`px-4 py-2 flex border-b-2  transition-colors duration-300 ${
            activeIndex === index
              ? "border-[#A81F23] text-[#A81F23]"
              : "border-[#F4F3F7] text-[[#F4F3F7]"
          }`}
        >
          <button key={slide._id} onClick={() => handleSlideClick(index)}>
            <Image
              src={slide?.image?.asset?.image_url || "/assets/military-image-2.png"}
              width={100}
              height={100}
              className="w-[130px] min-w-[130px] h-auto mt-5"
              alt={slide?.image?.alt || "Description of the image"}
            />
          </button>
        </div>
      ))}
    </div>
  );
};

export default Slider;
