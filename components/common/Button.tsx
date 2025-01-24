import React from "react";
import "@/styles/globals.css";

interface ButtonProps {
  buttonText: string;
  onClick?: () => void;
  divClassName?: string;
}

const Button: React.FC<ButtonProps> = ({ buttonText, onClick, divClassName }) => {
  return (
    <div className={`lg:py-8 md:py-8 sm:py-2 py-2 ${divClassName}`}>
      <button
        onClick={onClick}
        className="items-center bg-[#A81F23] w-auto inline-flex xl:px-[30px] lg:px-[30px] sm:px-[20px] px-[20px] xl:py-[15px] lg:py-[15px] sm:py-[14px] py-[14px] rounded-[16px] text-center tracking-[1px] hover:tracking-[5px] duration-500 transition-all hover:bg-[#871B1C] active:bg-[#871B1C]"
      >
        <span
          className="xl:text-[18px] lg:text-[18px] md:text-[18px] sm:text-[14px] text-[14px] font-normal leading-6 bg-cover 
            text-white text-nowrap tahoma"
        >
          {buttonText}
        </span>
      </button>
    </div>
  );
};

export default Button;
