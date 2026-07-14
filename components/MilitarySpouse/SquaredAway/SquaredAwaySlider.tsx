"use client";
import React, { useState } from "react";
import Image from "next/image";

// Plain serializable shape passed from the server components (SquaredAway,
// MilSpouseApproved) that fetch the approved-company list via
// militarySpouseService. This client file must not import the service — it
// now pulls in the server-only content loaders.
export interface ApprovedCompanySlide {
  _id: string;
  image: {
    alt: string;
    asset: {
      image_url: string;
    };
  };
}

interface SliderProps {
  companies: ApprovedCompanySlide[];
}

const Slider = ({ companies }: SliderProps) => {
  const [activeIndex, setActiveIndex] = useState(0);

  const handleSlideClick = (index: number) => {
    setActiveIndex(index);
  };

  return (
    <div className="w-full flex overflow-x-auto">
      {companies.map((slide, index) => (
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
              alt={slide?.image?.alt || "Employer partner logo"}
            />
          </button>
        </div>
      ))}
    </div>
  );
};

export default Slider;
