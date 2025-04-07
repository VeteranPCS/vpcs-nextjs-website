import React from "react";
import "@/app/globals.css";

interface ButtonProps {
  buttonText: string;
  onClick?: () => void;
  divClassName?: string;
  buttonClassName?: string;
  variant?: "primary" | "secondary" | "outline";
  size?: "small" | "medium" | "large";
}

const Button: React.FC<ButtonProps> = ({ 
  buttonText, 
  onClick, 
  divClassName = "", 
  buttonClassName = "", 
  variant = "primary",
  size = "medium"
}) => {
  // Base classes for all button variants
  const baseClasses = "items-center w-auto inline-flex text-center transition-all duration-300 ease-in-out rounded-button font-tahoma text-nowrap";
  
  // Variant specific classes
  const variantClasses = {
    primary: "bg-accent-red hover:bg-accent-red-hover text-white",
    secondary: "bg-white border-2 border-accent-red text-accent-red hover:bg-accent-red hover:text-white",
    outline: "bg-transparent border-2 border-white text-white hover:bg-white hover:text-primary",
  };
  
  // Size specific classes
  const sizeClasses = {
    small: "px-4 py-2 text-sm",
    medium: "xl:px-8 lg:px-8 md:px-6 sm:px-5 px-5 xl:py-4 lg:py-4 md:py-3.5 sm:py-3.5 py-3.5 text-base",
    large: "px-10 py-5 text-lg",
  };
  
  return (
    <div className={`lg:py-8 md:py-8 sm:py-2 py-2 ${divClassName}`}>
      <button
        onClick={onClick}
        className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${buttonClassName}`}
      >
        <span className="font-normal leading-6">
          {buttonText}
        </span>
      </button>
    </div>
  );
};

export default Button;