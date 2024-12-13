import React, { useState } from "react";
import Image from "next/image";

import image1 from "../../../public/assets/MovingLifeimg1.png";
import image2 from "../../../public/assets/BBBrating.png";
import image3 from "../../../public/assets/militaryonesource.png";
import image4 from "../../../public/assets/SpouselyFlagLogo.png";
import image5 from "../../../public/assets/SpouselyFlagLogo.png";

const Slider = () => {
  const [activeIndex, setActiveIndex] = useState(0);

  const slides = [
    { id: 1, content: image1 },
    { id: 2, content: image2 },
    { id: 3, content: image3 },
    { id: 4, content: image4 },
    { id: 4, content: image5 },
  ];

  const handleSlideClick = (index: number) => {
    setActiveIndex(index);
  };

  return (
    <div className="w-full flex overflow-x-auto">
      {slides.map((slide, index) => (
        <div
          key={slide.id}
          className={`px-4 py-2 flex border-b-2  transition-colors duration-300 ${
            activeIndex === index
              ? "border-[#A81F23] text-[#A81F23]"
              : "border-[#F4F3F7] text-[[#F4F3F7]"
          }`}
        >
          <button key={slide.id} onClick={() => handleSlideClick(index)}>
            <Image
              src={slide.content}
              width={100}
              height={100}
              className="w-[130px] min-w-[130px] h-auto mt-5"
              alt="Description of the image"
            />
          </button>
        </div>
      ))}
    </div>
  );
};

export default Slider;
