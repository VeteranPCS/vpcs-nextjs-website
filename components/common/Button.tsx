import React from "react";
import "@/app/globals.css";

interface ButtonProps {
  buttonText: string;
  onClick?: () => void;
  divClassName?: string;
  buttonClassName?: string;
}

const Button: React.FC<ButtonProps> = ({ buttonText, onClick, divClassName, buttonClassName }) => {
  return (
    <div className={`lg:py-8 md:py-8 sm:py-2 py-2 ${divClassName}`}>
      <button
        onClick={onClick}
        className={`${buttonClassName} items-center bg-[#A81F23] w-auto inline-flex xl:px-8 lg:px-8 sm:px-5 px-5 xl:py-4 lg:py-4 sm:py-3.5 py-3.5 rounded-2xl text-center duration-500 transition-all hover:bg-[#871B1C] active:bg-[#871B1C]`}
      >
        <span
          className="xl:text-lg lg:text-lg md:text-lg text-sm font-normal leading-6 bg-cover 
            text-white text-nowrap tahoma"
        >
          {buttonText}
        </span>
      </button>
    </div>
  );
};

export default Button;
