import React from "react";
import "@/app/globals.css";

interface ButtonProps {
  buttonText: string;
  href?: string;
  target?: React.HTMLAttributeAnchorTarget;
  rel?: string;
  onClick?: () => void;
  divClassName?: string;
  buttonClassName?: string;
}

const Button: React.FC<ButtonProps> = ({
  buttonText,
  href,
  target,
  rel,
  onClick,
  divClassName = "",
  buttonClassName = "",
}) => {
  const className = `${buttonClassName} items-center bg-[#A81F23] w-auto inline-flex xl:px-8 lg:px-8 sm:px-5 px-5 xl:py-4 lg:py-4 sm:py-3.5 py-3.5 rounded-2xl text-center duration-500 transition-all hover:bg-[#871B1C] active:bg-[#871B1C]`;

  const label = (
    <span
      className="xl:text-lg lg:text-lg md:text-lg text-sm font-normal leading-6 bg-cover 
            text-white text-nowrap tahoma"
    >
      {buttonText}
    </span>
  );

  return (
    <div className={`lg:py-8 md:py-8 sm:py-2 py-2 ${divClassName}`}>
      {href ? (
        <a href={href} target={target} rel={rel} onClick={onClick} className={className}>
          {label}
        </a>
      ) : (
        <button onClick={onClick} className={className}>
          {label}
        </button>
      )}
    </div>
  );
};

export default Button;
