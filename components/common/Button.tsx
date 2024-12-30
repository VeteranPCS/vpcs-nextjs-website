import React from "react";
import Link from "next/link";
import "@/styles/globals.css";

interface ButtonProps {
  buttonText: string;
  onClick?: () => void;
}

const Button: React.FC<ButtonProps> = ({ buttonText, onClick }) => {
  return (
    <div className="lg:py-8 md:py-8 sm:py-2 py-2">
      <button
        onClick={onClick}
        className="items-center bg-[#A81F23] w-auto inline-flex xl:px-[30px] lg:px-[30px] sm:px-[15px] px-[15px] xl:py-[15px] lg:py-[15px] sm:py-[10px] py-[10px] rounded-[16px] text-center tracking-[1px] hover:tracking-[5px] duration-500 transition-all"
      >
        <span
          className="xl:text-[18px] lg:text-[18px] md:text-[18px] sm:text-[12px] text-[12px] font-normal leading-6 bg-cover 
            text-white text-nowrap tahoma"
        >
          {buttonText}
        </span>
      </button>
    </div>
  );
};

export default Button;
